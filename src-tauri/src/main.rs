// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs::{self};
use std::path::Path;
use chrono::Local;
use serde::{Serialize, Deserialize};
use tokio;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};
use actix_web::{web, App, HttpServer, middleware};
use actix_cors::Cors;
use once_cell::sync::Lazy;

// Import our modules
mod auth;
mod api;

// Data structures for Tauri commands
#[derive(Debug, Serialize, Deserialize)]
pub struct BackupFile {
    pub filename: String,
    pub backup_date: String,
    pub file_path: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NetworkLog {
    pub id: String,
    pub timestamp: String,
    pub domain: String,
    pub ip_address: String,
    pub ip_version: String, // "IPv4" or "IPv6"
    pub status: String, // "Allowed", "Blocked", "Unknown"
    pub direction: String, // "Incoming" or "Outgoing"
    pub protocol: String, // "TCP", "UDP", etc.
    pub port: Option<u16>,
    pub user_agent: Option<String>,
    pub source_ip: Option<String>,
    pub destination_ip: Option<String>,
}

// Global state for network logs
static NETWORK_LOGS: Lazy<Arc<Mutex<Vec<NetworkLog>>>> = Lazy::new(|| Arc::new(Mutex::new(Vec::new())));
static MONITORING_STATE: Lazy<Arc<Mutex<bool>>> = Lazy::new(|| Arc::new(Mutex::new(false)));

fn get_network_logs() -> Arc<Mutex<Vec<NetworkLog>>> {
    NETWORK_LOGS.clone()
}

fn get_monitoring_state() -> Arc<Mutex<bool>> {
    MONITORING_STATE.clone()
}

// ===== BACKUP FUNCTIONS =====

// Get list of backup files
#[tauri::command]
fn get_backup_files() -> Result<Vec<BackupFile>, String> {
    // Use user's home directory for backups instead of /etc
    let home_dir = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    let backup_dir = format!("{}/.hostdni/backups", home_dir);
    
    // Create backup directory if it doesn't exist
    if !Path::new(&backup_dir).exists() {
        if let Err(e) = fs::create_dir_all(&backup_dir) {
            return Err(format!("Failed to create backup directory: {}", e));
        }
    }
    
    let mut backup_files = Vec::new();
    
    if let Ok(entries) = fs::read_dir(&backup_dir) {
            for entry in entries {
                if let Ok(entry) = entry {
                    let path = entry.path();
                if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("backup") {
                    if let Ok(metadata) = fs::metadata(&path) {
                        if let Ok(_created) = metadata.created() {
                            let _created_time = SystemTime::now()
                                .duration_since(UNIX_EPOCH)
                                .unwrap()
                                .as_secs();
                            
                            let filename = path.file_name()
                                .and_then(|n| n.to_str())
                                .unwrap_or("unknown")
                                .to_string();
                            
                            let backup_date = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
                            
                                    backup_files.push(BackupFile {
                                filename,
                                backup_date,
                                        file_path: path.to_string_lossy().to_string(),
                                    });
                                }
                            }
                        }
                    }
                }
            }
            
    // Sort by creation time (newest first)
    backup_files.sort_by(|a, b| b.backup_date.cmp(&a.backup_date));
            
            Ok(backup_files)
}

// Backup the current hosts file
#[tauri::command]
async fn backup_current_hosts_file() -> Result<(), String> {
    let hosts_path = "/etc/hosts";
    let backup_dir = "/etc/hosts_backups";
    
    // Check if hosts file exists
    if !Path::new(hosts_path).exists() {
        return Err("No hosts file found to backup".to_string());
    }
    
    // Create backup directory if it doesn't exist (requires elevated permissions)
    if !Path::new(backup_dir).exists() {
        let script = format!(
            "do shell script \"mkdir -p {}\" with administrator privileges",
            backup_dir
        );
        
        let output = std::process::Command::new("osascript")
            .args(&["-e", &script])
            .output();
        
        match output {
            Ok(result) => {
                if !result.status.success() {
                    let error_msg = String::from_utf8_lossy(&result.stderr);
                    return Err(format!("Failed to create backup directory: {}", error_msg));
                }
            }
            Err(e) => {
                return Err(format!("Failed to execute directory creation command: {}", e));
            }
        }
    }
    
    // Generate backup filename with timestamp
    let timestamp = Local::now().format("%Y%m%d_%H%M%S").to_string();
    let backup_filename = format!("hosts_{}.backup", timestamp);
    let backup_path = format!("{}/{}", backup_dir, backup_filename);
    
    // Use osascript to show native macOS authentication dialog
    let script = format!(
        "do shell script \"cp {} {}\" with administrator privileges",
        hosts_path, backup_path
    );
    
    let output = std::process::Command::new("osascript")
        .args(&["-e", &script])
        .output();
    
    match output {
        Ok(result) => {
            if result.status.success() {
                println!("Hosts file backed up to: {}", backup_path);
                Ok(())
            } else {
                let error_msg = String::from_utf8_lossy(&result.stderr);
                Err(format!("Failed to create backup: {}", error_msg))
            }
        }
        Err(e) => Err(format!("Failed to execute command: {}", e)),
    }
}

// ===== BLOCK/ALLOW LIST FUNCTIONS =====



// Save hosts file
#[tauri::command]
async fn save_hosts_file(hosts_content: String) -> Result<(), String> {
    // Use the provided hosts content instead of creating a basic one
    let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    
    // Add timestamp header to the content
    let final_content = format!("# Managed by HostDNI. Last updated at: {}\n\n{}", timestamp, hosts_content);
    
    // Write to hosts file (this would require elevated permissions)
    let hosts_path = "/etc/hosts";
    
    // Create a temporary file in a writable location
    let temp_dir = std::env::temp_dir();
    let temp_file = temp_dir.join("hostdni_hosts_temp");
    
    // Write content to temporary file
    if let Err(e) = fs::write(&temp_file, final_content) {
        return Err(format!("Failed to create temporary hosts file: {}", e));
    }
    
    // Use osascript to show native macOS authentication dialog
    let script = format!(
        "do shell script \"cp {} {}\" with administrator privileges",
        temp_file.to_str().unwrap(), hosts_path
    );
    
    let output = std::process::Command::new("osascript")
        .args(&["-e", &script])
        .output();
    
    // Clean up temporary file
    let _ = fs::remove_file(&temp_file);
    
    match output {
        Ok(result) => {
            if result.status.success() {
                println!("Hosts file updated successfully");
                Ok(())
            } else {
                let error_msg = String::from_utf8_lossy(&result.stderr);
                Err(format!("Failed to write hosts file: {}", error_msg))
            }
        }
        Err(e) => Err(format!("Failed to execute command: {}", e)),
    }
}

// ===== NETWORK MONITORING FUNCTIONS =====

// Get network logs with pagination
#[tauri::command]
fn get_network_logs_page(page: usize, page_size: usize) -> Result<Vec<NetworkLog>, String> {
    let logs = get_network_logs();
    let logs_guard = logs.lock().map_err(|_| "Failed to lock logs")?;
    
    let start = page * page_size;
    let end = (start + page_size).min(logs_guard.len());
    
    if start >= logs_guard.len() {
        return Ok(Vec::new());
    }
    
    let page_logs = logs_guard[start..end].to_vec();
    Ok(page_logs)
}

// Get total count of network logs
#[tauri::command]
fn get_network_logs_count() -> Result<usize, String> {
    let logs = get_network_logs();
    let logs_guard = logs.lock().map_err(|_| "Failed to lock logs")?;
    Ok(logs_guard.len())
}

// Clear all network logs
#[tauri::command]
fn clear_network_logs() -> Result<(), String> {
    let logs = get_network_logs();
    let mut logs_guard = logs.lock().map_err(|_| "Failed to lock logs")?;
    logs_guard.clear();
    Ok(())
}

// Start network monitoring
#[tauri::command]
async fn start_network_monitoring() -> Result<(), String> {
    let monitoring_state = get_monitoring_state();
    let mut state_guard = monitoring_state.lock().map_err(|_| "Failed to lock monitoring state")?;
    
    if *state_guard {
        return Err("Network monitoring is already running".to_string());
    }
    
    *state_guard = true;
    drop(state_guard);
    
    // Start monitoring in background
    let _monitoring_state_clone = monitoring_state.clone();
    tokio::spawn(async move {
        let _ = capture_network_connections().await;
    });
    
    println!("Network monitoring started");
    Ok(())
}

// Stop network monitoring
#[tauri::command]
fn stop_network_monitoring() -> Result<(), String> {
    let monitoring_state = get_monitoring_state();
    let mut state_guard = monitoring_state.lock().map_err(|_| "Failed to lock monitoring state")?;
    *state_guard = false;
    println!("Network monitoring stopped");
    Ok(())
}

// Capture network connections
async fn capture_network_connections() -> Result<(), String> {
    // This would implement actual network monitoring
    // For now, just generate sample logs
    generate_sample_logs().await
}

// Generate sample network logs for testing
#[tauri::command]
async fn generate_sample_logs() -> Result<(), String> {
    let logs = get_network_logs();
    let mut logs_guard = logs.lock().map_err(|_| "Failed to lock logs")?;
    
    let sample_domains = vec![
        ("google.com", "142.250.190.78", "Allowed"),
        ("facebook.com", "157.240.241.35", "Blocked"),
        ("youtube.com", "142.250.190.78", "Allowed"),
        ("twitter.com", "104.244.42.193", "Blocked"),
        ("github.com", "140.82.112.4", "Allowed"),
    ];
    
    for (domain, ip, status) in &sample_domains {
        let log = NetworkLog {
            id: format!("log_{}", SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos()),
            timestamp: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
            domain: domain.to_string(),
            ip_address: ip.to_string(),
            ip_version: "IPv4".to_string(),
            status: status.to_string(),
            direction: "Outgoing".to_string(),
            protocol: "TCP".to_string(),
            port: Some(443),
            user_agent: Some("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36".to_string()),
            source_ip: Some("192.168.1.100".to_string()),
            destination_ip: Some(ip.to_string()),
        };
        logs_guard.push(log);
    }
    
    println!("Generated {} sample network logs", sample_domains.len());
    Ok(())
}

fn main() {
    // Start the API token rotation
    auth::start_token_rotation();

    // Start the Actix REST API server in a background thread
    std::thread::spawn(|| {
        let sys = actix_rt::System::new();
        sys.block_on(async {
            let server = HttpServer::new(|| {
                let cors = Cors::default()
                    .allow_any_origin()
                    .allow_any_method()
                    .allow_any_header()
                    .max_age(3600);
                App::new()
                    .wrap(cors)
                    .wrap(middleware::Logger::default())
                    // Auth endpoint: only /api/auth/token
                    .service(
                        web::scope("/api/auth")
                            .route("/token", web::get().to(auth::get_token))
                    )
                    // Host entries endpoints (streaming from /etc/hosts)
                    .service(
                        web::scope("/api/etc/hosts")
                            .route("", web::get().to(api::get_host_entries))
                            .route("", web::post().to(api::create_host_entry))
                            .route("/count", web::get().to(api::get_hosts_count))
                            .route("/stream", web::get().to(api::stream_host_entries))
                            .route("/status", web::get().to(api::get_hosts_status))
                            .route("/disable", web::post().to(api::disable_hosts_file))
                            .route("/enable", web::post().to(api::enable_hosts_file))
                            .route("/build_and_save", web::post().to(api::build_and_save_hosts_file))
                    )

                    // Backups endpoints
                    .service(
                        web::scope("/api/backups")
                            .route("/folder-status", web::get().to(api::get_backup_folder_status))
                            .route("/files", web::get().to(api::get_backup_files))
                            .route("", web::get().to(api::get_backups))
                            .route("", web::post().to(api::create_backup))
                    )
                    // Allow lists endpoints
                    .service(
                        web::scope("/api/allow-lists")
                            .route("", web::get().to(api::get_allow_lists))
                    )
                    // Block lists endpoints
                    .service(
                        web::scope("/api/block-lists")
                            .route("", web::get().to(api::get_block_lists))
                    )

                    // System endpoints
                    .route("/api/health", web::get().to(api::health_check))
                    .route("/api/stats", web::get().to(api::get_stats))
            })
            .bind("127.0.0.1:8080")
            .unwrap();
            println!("REST API server running on http://127.0.0.1:8080");
            server.run().await.unwrap();
        });
    });

    // Run the Tauri app on the main thread
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_backup_files,
            backup_current_hosts_file,
            save_hosts_file,
            get_network_logs_page,
            get_network_logs_count,
            clear_network_logs,
            start_network_monitoring,
            stop_network_monitoring,
            generate_sample_logs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}