use std::fs::File;
use std::io::prelude::*;

// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Learn more about Tauri commands at https://tauri.app/v1/guides/features/command


// Read the current OS's /etc/hosts file
// ----------------------------------------------------------------------------
#[tauri::command]
fn read_from_hosts_file() -> Result<String, String> {
    let mut file = match File::open("/etc/hosts") {
        Ok(f) => f,
        Err(_) => return Err(String::from("Failed to open the hosts file")),
    };
    let mut contents = String::new();
    if let Err(_) = file.read_to_string(&mut contents) {
        return Err(String::from("Failed to read the hosts file contents"));
    }
    Ok(contents)
}


// Disable the current /etc/hosts file by making it blank
// ----------------------------------------------------------------------------
#[tauri::command]
fn disable_hosts_file() -> Result<(), String> {
    let hosts_path = "/etc/hosts";
    let backup_dir = "/etc/hosts_backup/";
    let disabled_hosts_path = "/etc/hosts_disabled";

    // Create the backup directory if it doesn't exist
    if let Err(_) = fs::create_dir_all(backup_dir) {
        return Err(String::from("Failed to create backup directory"));
    }

    // Rename the /etc/hosts file to /etc/hosts_disabled
    if let Err(_) = fs::rename(hosts_path, disabled_hosts_path) {
        return Err(String::from("Failed to disable hosts file"));
    }

    // Create a new hosts file with specified content
    let new_hosts_content = "\
        # Managed by host-blokr\n\
        127.0.0.1 localhost\n\
        127.0.0.1 localhost.localdomain\n\
        127.0.0.1 local\n\
        255.255.255.255 broadcasthost\n\
        ::1 localhost\n\
        ::1 ip6-localhost\n\
        ::1 ip6-loopback\n\
        fe80::1%lo0 localhost\n\
        ff00::0 ip6-localnet\n\
        ff00::0 ip6-mcastprefix\n\
        ff02::1 ip6-allnodes\n\
        ff02::2 ip6-allrouters\n\
        ff02::3 ip6-allhosts\n\
        0.0.0.0 0.0.0.0\n";

    let mut file = match File::create(hosts_path) {
        Ok(f) => f,
        Err(_) => return Err(String::from("Failed to create new hosts file")),
    };

    if let Err(_) = write!(file, "{}", new_hosts_content) {
        return Err(String::from("Failed to write to the new hosts file"));
    }

    Ok(())
}


// Re-enable the current /etc/hosts file
// ----------------------------------------------------------------------------
#[tauri::command]
fn enable_hosts_file() -> Result<(), String> {
    let hosts_path = "/etc/hosts";
    let disabled_hosts_path = "/etc/hosts_disabled";

    // Check if hosts_disabled exists
    if Path::new(disabled_hosts_path).exists() {
        // Remove the current hosts file
        if let Err(_) = fs::remove_file(hosts_path) {
            return Err(String::from("Failed to remove the current hosts file"));
        }

        // Rename hosts_disabled to hosts
        if let Err(_) = fs::rename(disabled_hosts_path, hosts_path) {
            return Err(String::from("Failed to swap hosts files"));
        }
    }

    Ok(())
}


// Backup the current hosts file and create a new /etc/hosts file
// ----------------------------------------------------------------------------
#[tauri::command]
fn write_to_hosts_file(new_content: String) -> Result<(), String> {
    let hosts_path = "/etc/hosts";
    let backup_dir = "/etc/hosts_backup/";

    // Create the backup directory if it doesn't exist
    if let Err(_) = fs::create_dir_all(backup_dir) {
        return Err(String::from("Failed to create backup directory"));
    }

    let timestamp = Local::now().format("%Y-%m-%dT%H-%M-%S").to_string();
    let backup_path = format!("{}/hosts-{}", backup_dir, timestamp);

    // Copy the hosts file to the backup path
    if let Err(_) = fs::copy(hosts_path, &backup_path) {
        return Err(String::from("Failed to create backup"));
    }

    // Open the hosts file in write mode, creating it if it doesn't exist
    let mut file = match File::create(hosts_path) {
        Ok(f) => f,
        Err(_) => return Err(String::from("Failed to open the hosts file")),
    };

    // Write the new content to the hosts file
    if let Err(_) = write!(file, "{}", new_content) {
        return Err(String::from("Failed to overwrite the hosts file"));
    }
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            read_from_hosts_file,
            disable_hosts_file,
            enable_hosts_file,
            write_to_hosts_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}