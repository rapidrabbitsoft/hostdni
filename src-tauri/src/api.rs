use actix_web::{web, HttpRequest, HttpResponse, Responder};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use chrono::{DateTime, Utc};
use crate::auth;
use std::fs::{File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use regex::Regex;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH, Duration};

// Data structures
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HostEntry {
    pub id: String,
    pub ip: String,
    pub hostname: String,
    pub comment: Option<String>,
    pub enabled: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateHostEntryRequest {
    pub ip: String,
    pub hostname: String,
    pub comment: Option<String>,
    pub enabled: Option<bool>,
}





#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BackupConfig {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: DateTime<Utc>,
    pub entries_count: usize,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateBackupRequest {
    pub name: String,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AllowListEntry {
    pub id: String,
    pub pattern: String,
    pub description: Option<String>,
    pub enabled: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BlockListEntry {
    pub id: String,
    pub pattern: String,
    pub description: Option<String>,
    pub enabled: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub message: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaginatedResponse<T> {
    pub data: Vec<T>,
    pub total: usize,
    pub page: usize,
    pub page_size: usize,
    pub total_pages: usize,
    pub has_next: bool,
    pub has_prev: bool,
}

// Global storage for other data (not hosts entries)
lazy_static::lazy_static! {
    static ref BACKUPS: Arc<Mutex<HashMap<String, BackupConfig>>> = Arc::new(Mutex::new(HashMap::new()));
    static ref ALLOW_LISTS: Arc<Mutex<HashMap<String, AllowListEntry>>> = Arc::new(Mutex::new(HashMap::new()));
    static ref BLOCK_LISTS: Arc<Mutex<HashMap<String, BlockListEntry>>> = Arc::new(Mutex::new(HashMap::new()));
}

// Helper function to generate UUID
fn generate_id() -> String {
    uuid::Uuid::new_v4().to_string()
}

// Helper function to get current timestamp
fn now() -> DateTime<Utc> {
    Utc::now()
}

// Parse hosts file content into structured entries
fn parse_hosts_content(content: &str) -> Vec<HostEntry> {
    let lines = content.split('\n');
    let mut entries = Vec::new();
    let mut _entry_order = 0;
    
    // Regex patterns for validation
    let ipv4_pattern = Regex::new(r"^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$").unwrap();
    let ipv6_pattern = Regex::new(r"^(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?:(?::[0-9a-fA-F]{1,4}){1,6})|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(?::[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(?:ffff(?::0{1,4}){0,1}:){0,1}(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])|(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$").unwrap();
    
    for (index, line) in lines.enumerate() {
        let trimmed_line = line.trim();
        
        // Skip empty lines
        if trimmed_line.is_empty() {
            continue;
        }
        
        // Check if line is commented out (disabled)
        let is_enabled = !trimmed_line.starts_with('#');
        let working_line = if is_enabled { trimmed_line } else { &trimmed_line[1..].trim() };
        
        // Skip pure comments (lines that start with # and don't have valid IP/hostname data)
        if working_line.is_empty() || working_line.starts_with('#') {
            continue;
        }
        
        // Parse IP and hostname
        let parts: Vec<&str> = working_line.split_whitespace().collect();
        if parts.len() >= 2 {
            let ip = parts[0];
            let hostname = parts[1];
            
            // Validate IP using regex
            let is_valid_ip = ipv4_pattern.is_match(ip) || ipv6_pattern.is_match(ip);
            
            // More permissive hostname validation
            let is_valid_hostname = !hostname.is_empty() && 
                                   !hostname.starts_with('#') && 
                                   !hostname.contains(char::is_whitespace) &&
                                   hostname.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '.' || c == '%');
            
            // Only add entry if both IP and hostname are valid
            if is_valid_ip && is_valid_hostname {
                // Extract comment if present
                let comment = if parts.len() > 2 {
                    Some(parts[2..].join(" "))
                } else {
                    None
                };
                
                entries.push(HostEntry {
                    id: format!("entry_{}", index),
                    ip: ip.to_string(),
                    hostname: hostname.to_string(),
                    comment,
                    enabled: is_enabled,
                    created_at: now(),
                    updated_at: now(),
                });
                _entry_order += 1;
            }
        }
    }
    
    entries
}

// Read hosts file with streaming support
fn read_hosts_file_streaming(page: usize, page_size: usize) -> Result<PaginatedResponse<HostEntry>, String> {
    let hosts_path = "/etc/hosts";
    let backup_path = "/etc/hosts.backup";
    
    // Check if hosts file is disabled (backup exists, original doesn't)
    if Path::new(backup_path).exists() && !Path::new(hosts_path).exists() {
        return Err("Hosts file is currently disabled".to_string());
    }
    
    // Check if file exists
    if !Path::new(hosts_path).exists() {
        return Err("Hosts file not found".to_string());
    }
    
    // Regex patterns for validation
    let ipv4_pattern = Regex::new(r"^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$").unwrap();
    let ipv6_pattern = Regex::new(r"^(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?:(?::[0-9a-fA-F]{1,4}){1,6})|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(?::[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(?:ffff(?::0{1,4}){0,1}:){0,1}(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])|(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$").unwrap();
    
    let file = File::open(hosts_path)
        .map_err(|_| "Failed to open hosts file".to_string())?;
    
    let reader = BufReader::new(file);
    let mut all_entries = Vec::new();
    let mut entry_order = 0;
    
    // Read all entries first to preserve order
    for (_line_index, line) in reader.lines().enumerate() {
        if let Ok(line) = line {
            let trimmed_line = line.trim();
            
            if trimmed_line.is_empty() {
                continue;
            }
            
            let is_enabled = !trimmed_line.starts_with('#');
            let working_line = if is_enabled { trimmed_line } else { &trimmed_line[1..].trim() };
            
            if working_line.is_empty() || working_line.starts_with('#') {
                continue;
            }
            
            let parts: Vec<&str> = working_line.split_whitespace().collect();
            if parts.len() >= 2 {
                let ip = parts[0];
                let hostname = parts[1];
                
                // Validate IP and hostname
                let is_valid_ip = ipv4_pattern.is_match(ip) || ipv6_pattern.is_match(ip);
                let is_valid_hostname = !hostname.is_empty() && 
                                       !hostname.contains(char::is_whitespace) &&
                                       hostname.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '.' || c == '%');
                
                // Only process if both IP and hostname are valid
                if is_valid_ip && is_valid_hostname {
                    let comment = if parts.len() > 2 {
                        Some(parts[2..].join(" "))
                    } else {
                        None
                    };
                    
                    all_entries.push(HostEntry {
                        id: format!("entry_{}", entry_order),
                        ip: ip.to_string(),
                        hostname: hostname.to_string(),
                        comment,
                        enabled: is_enabled,
                        created_at: now(),
                        updated_at: now(),
                    });
                    entry_order += 1;
                }
            }
        }
    }
    
    let total_entries = all_entries.len();
    let start_index = page * page_size;
    let end_index = (start_index + page_size).min(total_entries);
    
    // Extract the requested page
    let entries = if start_index < total_entries {
        all_entries[start_index..end_index].to_vec()
    } else {
        Vec::new()
    };
    
    let total_pages = (total_entries + page_size - 1) / page_size;
    
    Ok(PaginatedResponse {
        data: entries,
        total: total_entries,
        page,
        page_size,
        total_pages,
        has_next: page < total_pages - 1,
        has_prev: page > 0,
    })
}

// Write hosts file with streaming support
fn write_hosts_file_streaming(entries: Vec<HostEntry>) -> Result<(), String> {
    let hosts_path = "/etc/hosts";
    let backup_path = "/etc/hosts.backup";
    
    // Check if hosts file is disabled (backup exists, original doesn't)
    if Path::new(backup_path).exists() && !Path::new(hosts_path).exists() {
        return Err("Cannot write to hosts file while it is disabled".to_string());
    }
    
    // Create backup first
    if Path::new(hosts_path).exists() {
        std::fs::copy(hosts_path, backup_path)
            .map_err(|_| "Failed to create backup".to_string())?;
    }
    
    // Write new content
    let mut file = OpenOptions::new()
        .write(true)
        .truncate(true)
        .open(hosts_path)
        .map_err(|_| "Failed to open hosts file for writing".to_string())?;
    
    // Write header
    writeln!(file, "# HostDNI managed hosts file")
        .map_err(|_| "Failed to write header".to_string())?;
    writeln!(file, "# Generated on: {}", now().to_rfc3339())
        .map_err(|_| "Failed to write timestamp".to_string())?;
    writeln!(file, "")
        .map_err(|_| "Failed to write empty line".to_string())?;
    
    // Write entries in chunks to avoid memory issues
    let chunk_size = 1000;
    for chunk in entries.chunks(chunk_size) {
        for entry in chunk {
            let line = if entry.enabled {
                if let Some(ref comment) = entry.comment {
                    format!("{} {}\t# {}", entry.ip, entry.hostname, comment)
                } else {
                    format!("{} {}", entry.ip, entry.hostname)
                }
            } else {
                if let Some(ref comment) = entry.comment {
                    format!("# {} {}\t# {}", entry.ip, entry.hostname, comment)
                } else {
                    format!("# {} {}", entry.ip, entry.hostname)
                }
            };
            
            writeln!(file, "{}", line)
                .map_err(|_| "Failed to write entry".to_string())?;
        }
        
        // Flush after each chunk to ensure data is written
        file.flush()
            .map_err(|_| "Failed to flush file".to_string())?;
    }
    
    Ok(())
}

// Get total count of hosts entries
fn get_hosts_file_count() -> Result<usize, String> {
    let hosts_path = "/etc/hosts";
    let backup_path = "/etc/hosts.backup";
    
    // Check if hosts file is disabled (backup exists, original doesn't)
    if Path::new(backup_path).exists() && !Path::new(hosts_path).exists() {
        return Err("Hosts file is currently disabled".to_string());
    }
    
    if !Path::new(hosts_path).exists() {
        return Ok(0);
    }
    
    // Regex patterns for validation (same as streaming function)
    let ipv4_pattern = Regex::new(r"^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$").unwrap();
    let ipv6_pattern = Regex::new(r"^(?:(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,7}:|(?:[0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|(?:[0-9a-fA-F]{1,4}:){1,5}(?::[0-9a-fA-F]{1,4}){1,2}|(?:[0-9a-fA-F]{1,4}:){1,4}(?::[0-9a-fA-F]{1,4}){1,3}|(?:[0-9a-fA-F]{1,4}:){1,3}(?::[0-9a-fA-F]{1,4}){1,4}|(?:[0-9a-fA-F]{1,4}:){1,2}(?::[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:(?:(?::[0-9a-fA-F]{1,4}){1,6})|:(?:(?::[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(?::[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(?:ffff(?::0{1,4}){0,1}:){0,1}(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])|(?:[0-9a-fA-F]{1,4}:){1,4}:(?:(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$").unwrap();
    
    let file = File::open(hosts_path)
        .map_err(|_| "Failed to open hosts file".to_string())?;
    
    let reader = BufReader::new(file);
    let mut count = 0;
    
    for line in reader.lines() {
        if let Ok(line) = line {
            let trimmed_line = line.trim();
            
            // Skip empty lines
            if trimmed_line.is_empty() {
                continue;
            }
            
            // Check if line is commented out (disabled)
            let is_enabled = !trimmed_line.starts_with('#');
            let working_line = if is_enabled { trimmed_line } else { &trimmed_line[1..].trim() };
            
            // Skip pure comments (lines that start with # and don't have valid IP/hostname data)
            if working_line.is_empty() || working_line.starts_with('#') {
                continue;
            }
            
            // Parse IP and hostname
            let parts: Vec<&str> = working_line.split_whitespace().collect();
            if parts.len() >= 2 {
                let ip = parts[0];
                let hostname = parts[1];
                
                // Validate IP using regex (same as streaming function)
                let is_valid_ip = ipv4_pattern.is_match(ip) || ipv6_pattern.is_match(ip);
                
                // More permissive hostname validation (same as streaming function)
                let is_valid_hostname = !hostname.is_empty() && 
                                       !hostname.starts_with('#') && 
                                       !hostname.contains(char::is_whitespace) &&
                                       hostname.chars().all(|c| c.is_alphanumeric() || c == '-' || c == '.' || c == '%');
                
                // Only count entry if both IP and hostname are valid
                if is_valid_ip && is_valid_hostname {
                    count += 1;
                }
            }
        }
    }
    
    Ok(count)
}

// ===== HOST ENTRIES ENDPOINTS =====

// GET /api/hosts - Get paginated host entries from /etc/hosts
pub async fn get_host_entries(req: HttpRequest) -> impl Responder {
    if !auth::validate_token(&req) {
        return HttpResponse::Unauthorized().json(ApiResponse::<PaginatedResponse<HostEntry>> {
            success: false,
            data: None,
            message: None,
            error: Some("Invalid or missing API token".to_string()),
        });
    }
    
    // Get query parameters
    let page = req.query_string()
        .split('&')
        .filter_map(|pair| {
            let mut parts = pair.splitn(2, '=');
            let key = parts.next()?;
            let value = parts.next()?;
            if key == "page" { value.parse::<usize>().ok() } else { None }
        })
        .next()
        .unwrap_or(0);
    let page_size = req.query_string()
        .split('&')
        .filter_map(|pair| {
            let mut parts = pair.splitn(2, '=');
            let key = parts.next()?;
            let value = parts.next()?;
            if key == "page_size" { value.parse::<usize>().ok() } else { None }
        })
        .next()
        .unwrap_or(1000) // Default to 1000
        .min(1000) // Minimum of 1000
        .max(20000); // Maximum of 20000
    
    match read_hosts_file_streaming(page, page_size) {
        Ok(paginated_data) => {
            HttpResponse::Ok().json(ApiResponse {
                success: true,
                data: Some(paginated_data),
                message: None,
                error: None,
            })
        }
        Err(e) => HttpResponse::InternalServerError().json(ApiResponse::<PaginatedResponse<HostEntry>> {
            success: false,
            data: None,
            message: None,
            error: Some(e),
        }),
    }
}

// POST /api/hosts - Add a new host entry to /etc/hosts
pub async fn create_host_entry(
    req: HttpRequest,
    entry_req: web::Json<CreateHostEntryRequest>,
) -> impl Responder {
    if !auth::validate_token(&req) {
        return HttpResponse::Unauthorized().json(ApiResponse::<HostEntry> {
            success: false,
            data: None,
            message: None,
            error: Some("Invalid or missing API token".to_string()),
        });
    }
    
    // Read current entries
    let current_entries = match read_hosts_file_streaming(0, usize::MAX) {
        Ok(data) => data.data,
        Err(e) => {
            return HttpResponse::InternalServerError().json(ApiResponse::<HostEntry> {
                success: false,
                data: None,
                message: None,
                error: Some(e),
            });
        }
    };
    
    // Create new entry
    let new_entry = HostEntry {
        id: generate_id(),
        ip: entry_req.ip.clone(),
        hostname: entry_req.hostname.clone(),
        comment: entry_req.comment.clone(),
        enabled: entry_req.enabled.unwrap_or(true),
        created_at: now(),
        updated_at: now(),
    };
    
    // Add to list and write back
    let mut updated_entries = current_entries;
    updated_entries.push(new_entry.clone());
    
    match write_hosts_file_streaming(updated_entries) {
        Ok(_) => {
            HttpResponse::Created().json(ApiResponse {
                success: true,
                data: Some(new_entry),
                message: Some("Host entry created successfully".to_string()),
                error: None,
            })
        }
        Err(e) => HttpResponse::InternalServerError().json(ApiResponse::<HostEntry> {
            success: false,
            data: None,
            message: None,
            error: Some(e),
        }),
    }
}




// ===== BACKUPS ENDPOINTS =====

// GET /api/backups/folder-status - Check if hosts_backups folder exists and create if needed
pub async fn get_backup_folder_status(req: HttpRequest) -> impl Responder {
    if !auth::validate_token(&req) {
        return HttpResponse::Unauthorized().json(ApiResponse::<serde_json::Value> {
            success: false,
            data: None,
            message: None,
            error: Some("Invalid or missing API token".to_string()),
        });
    }
    
    // Check for hosts_backups folder in user's home directory
    let home_dir = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    let hosts_backups_dir = format!("{}/hosts_backups", home_dir);
    let backup_dir = format!("{}/.hostdni/backups", home_dir);
    
    let mut hosts_backups_exists = Path::new(&hosts_backups_dir).exists();
    let backup_dir_exists = Path::new(&backup_dir).exists();
    let mut folder_created = false;
    let mut error_message = None;
    
    // Create hosts_backups folder if it doesn't exist
    if !hosts_backups_exists {
        // Try to create the directory normally first
        match std::fs::create_dir_all(&hosts_backups_dir) {
            Ok(_) => {
                hosts_backups_exists = true;
                folder_created = true;
            }
            Err(e) => {
                // If normal creation fails, try with elevated permissions
                let script = format!(
                    "do shell script \"mkdir -p {}\" with administrator privileges",
                    hosts_backups_dir
                );
                
                let output = std::process::Command::new("osascript")
                    .args(&["-e", &script])
                    .output();
                
                match output {
                    Ok(result) => {
                        if result.status.success() {
                            hosts_backups_exists = true;
                            folder_created = true;
                        } else {
                            let error_msg = String::from_utf8_lossy(&result.stderr);
                            error_message = Some(format!("Failed to create hosts_backups folder: {}", error_msg));
                        }
                    }
                    Err(e) => {
                        error_message = Some(format!("Failed to execute command: {}", e));
                    }
                }
            }
        }
    }
    
    HttpResponse::Ok().json(ApiResponse {
        success: error_message.is_none(),
        data: Some(serde_json::json!({
            "hosts_backups_exists": hosts_backups_exists,
            "backup_dir_exists": backup_dir_exists,
            "hosts_backups_path": hosts_backups_dir,
            "backup_dir_path": backup_dir,
            "folder_created": folder_created,
            "timestamp": now().to_rfc3339()
        })),
        message: if folder_created { Some("Hosts backups folder created successfully".to_string()) } else { None },
        error: error_message,
    })
}

// GET /api/backups/files - Get list of backup files from hosts_backups directory
pub async fn get_backup_files(req: HttpRequest) -> impl Responder {
    if !auth::validate_token(&req) {
        return HttpResponse::Unauthorized().json(ApiResponse::<Vec<serde_json::Value>> {
            success: false,
            data: None,
            message: None,
            error: Some("Invalid or missing API token".to_string()),
        });
    }
    
    // Get hosts_backups directory path
    let home_dir = std::env::var("HOME").unwrap_or_else(|_| "/tmp".to_string());
    let hosts_backups_dir = format!("{}/hosts_backups", home_dir);
    
    // Check if hosts_backups directory exists and create if needed
    if !Path::new(&hosts_backups_dir).exists() {
        // Try to create the directory normally first
        match std::fs::create_dir_all(&hosts_backups_dir) {
            Ok(_) => {
                // Directory created successfully
            }
            Err(e) => {
                // If normal creation fails, try with elevated permissions
                let script = format!(
                    "do shell script \"mkdir -p {}\" with administrator privileges",
                    hosts_backups_dir
                );
                
                let output = std::process::Command::new("osascript")
                    .args(&["-e", &script])
                    .output();
                
                match output {
                    Ok(result) => {
                        if !result.status.success() {
                            let error_msg = String::from_utf8_lossy(&result.stderr);
                            return HttpResponse::InternalServerError().json(ApiResponse::<Vec<serde_json::Value>> {
                                success: false,
                                data: None,
                                message: None,
                                error: Some(format!("Failed to create hosts_backups directory: {}", error_msg)),
                            });
                        }
                    }
                    Err(e) => {
                        return HttpResponse::InternalServerError().json(ApiResponse::<Vec<serde_json::Value>> {
                            success: false,
                            data: None,
                            message: None,
                            error: Some(format!("Failed to execute command: {}", e)),
                        });
                    }
                }
            }
        }
    }
    
    let mut backup_files = Vec::new();
    
    // Read directory entries
    match std::fs::read_dir(&hosts_backups_dir) {
        Ok(entries) => {
            for entry in entries {
                if let Ok(entry) = entry {
                    let path = entry.path();
                    
                    // Check if it's a file and has .backup extension
                    if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("backup") {
                        if let Ok(metadata) = std::fs::metadata(&path) {
                            let filename = path.file_name()
                                .and_then(|n| n.to_str())
                                .unwrap_or("unknown")
                                .to_string();
                            
                            let file_path = path.to_string_lossy().to_string();
                            let file_size = metadata.len();
                            
                            // Get creation time
                            let created_time = metadata.created()
                                .unwrap_or_else(|_| SystemTime::now())
                                .duration_since(UNIX_EPOCH)
                                .unwrap_or_else(|_| Duration::from_secs(0))
                                .as_secs();
                            
                            // Format date
                            let backup_date = chrono::DateTime::from_timestamp(created_time as i64, 0)
                                .unwrap_or_else(|| chrono::Utc::now())
                                .format("%Y-%m-%d %H:%M:%S")
                                .to_string();
                            
                            backup_files.push(serde_json::json!({
                                "filename": filename,
                                "file_path": file_path,
                                "backup_date": backup_date,
                                "file_size": file_size,
                                "created_timestamp": created_time
                            }));
                        }
                    }
                }
            }
            
            // Sort by creation time (newest first)
            backup_files.sort_by(|a, b| {
                let a_time = a["created_timestamp"].as_u64().unwrap_or(0);
                let b_time = b["created_timestamp"].as_u64().unwrap_or(0);
                b_time.cmp(&a_time)
            });
            
            HttpResponse::Ok().json(ApiResponse {
                success: true,
                data: Some(backup_files),
                message: None,
                error: None,
            })
        }
        Err(e) => HttpResponse::InternalServerError().json(ApiResponse::<Vec<serde_json::Value>> {
            success: false,
            data: None,
            message: None,
            error: Some(format!("Failed to read hosts backups directory: {}", e)),
        }),
    }
}

// GET /api/backups - Get all backup configurations
pub async fn get_backups(req: HttpRequest) -> impl Responder {
    if !auth::validate_token(&req) {
        return HttpResponse::Unauthorized().json(ApiResponse::<Vec<BackupConfig>> {
            success: false,
            data: None,
            message: None,
            error: Some("Invalid or missing API token".to_string()),
        });
    }
    
    let backups = BACKUPS.lock().unwrap();
    let backups_vec: Vec<BackupConfig> = backups.values().cloned().collect();
    
    HttpResponse::Ok().json(ApiResponse {
        success: true,
        data: Some(backups_vec),
        message: None,
        error: None,
    })
}

// POST /api/backups - Create a new backup
pub async fn create_backup(
    req: HttpRequest,
    backup_req: web::Json<CreateBackupRequest>,
) -> impl Responder {
    if !auth::validate_token(&req) {
        return HttpResponse::Unauthorized().json(ApiResponse::<BackupConfig> {
            success: false,
            data: None,
            message: None,
            error: Some("Invalid or missing API token".to_string()),
        });
    }
    
    let id = generate_id();
    let now = now();
    let entries_count = get_hosts_file_count().unwrap_or(0);
    
    let new_backup = BackupConfig {
        id: id.clone(),
        name: backup_req.name.clone(),
        description: backup_req.description.clone(),
        created_at: now,
        entries_count,
    };
    
    BACKUPS.lock().unwrap().insert(id.clone(), new_backup.clone());
    
    HttpResponse::Created().json(ApiResponse {
        success: true,
        data: Some(new_backup),
        message: Some("Backup created successfully".to_string()),
        error: None,
    })
}

// ===== ALLOW LISTS ENDPOINTS =====

// GET /api/allow-lists - Get all allow list entries
pub async fn get_allow_lists(req: HttpRequest) -> impl Responder {
    if !auth::validate_token(&req) {
        return HttpResponse::Unauthorized().json(ApiResponse::<Vec<AllowListEntry>> {
            success: false,
            data: None,
            message: None,
            error: Some("Invalid or missing API token".to_string()),
        });
    }
    
    let allow_lists = ALLOW_LISTS.lock().unwrap();
    let allow_lists_vec: Vec<AllowListEntry> = allow_lists.values().cloned().collect();
    
    HttpResponse::Ok().json(ApiResponse {
        success: true,
        data: Some(allow_lists_vec),
        message: None,
        error: None,
    })
}

// ===== BLOCK LISTS ENDPOINTS =====

// GET /api/block-lists - Get all block list entries
pub async fn get_block_lists(req: HttpRequest) -> impl Responder {
    if !auth::validate_token(&req) {
        return HttpResponse::Unauthorized().json(ApiResponse::<Vec<BlockListEntry>> {
            success: false,
            data: None,
            message: None,
            error: Some("Invalid or missing API token".to_string()),
        });
    }
    
    let block_lists = BLOCK_LISTS.lock().unwrap();
    let block_lists_vec: Vec<BlockListEntry> = block_lists.values().cloned().collect();
    
    HttpResponse::Ok().json(ApiResponse {
        success: true,
        data: Some(block_lists_vec),
        message: None,
        error: None,
    })
}

// ===== SYSTEM ENDPOINTS =====

// GET /api/health - Health check endpoint
pub async fn health_check() -> impl Responder {
    HttpResponse::Ok().json(ApiResponse::<serde_json::Value> {
        success: true,
        data: Some(serde_json::json!({
            "status": "healthy",
            "timestamp": now().to_rfc3339(),
            "version": env!("CARGO_PKG_VERSION")
        })),
        message: Some("Service is healthy".to_string()),
        error: None,
    })
}

// GET /api/stats - Get system statistics
pub async fn get_stats(req: HttpRequest) -> impl Responder {
    if !auth::validate_token(&req) {
        return HttpResponse::Unauthorized().json(ApiResponse::<serde_json::Value> {
            success: false,
            data: None,
            message: None,
            error: Some("Invalid or missing API token".to_string()),
        });
    }
    
    let host_entries_count = get_hosts_file_count().unwrap_or(0);
    let backups_count = BACKUPS.lock().unwrap().len();
    let allow_lists_count = ALLOW_LISTS.lock().unwrap().len();
    let block_lists_count = BLOCK_LISTS.lock().unwrap().len();
    
    HttpResponse::Ok().json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({
            "host_entries": host_entries_count,
            "backups": backups_count,
            "allow_lists": allow_lists_count,
            "block_lists": block_lists_count,
            "timestamp": now().to_rfc3339()
        })),
        message: None,
        error: None,
    })
}

// GET /api/etc/hosts/count - Get total count of host entries
pub async fn get_hosts_count(req: HttpRequest) -> impl Responder {
    if !auth::validate_token(&req) {
        return HttpResponse::Unauthorized().json(ApiResponse::<usize> {
            success: false,
            data: None,
            message: None,
            error: Some("Invalid or missing API token".to_string()),
        });
    }
    
    match get_hosts_file_count() {
        Ok(count) => {
            HttpResponse::Ok().json(ApiResponse {
                success: true,
                data: Some(count),
                message: None,
                error: None,
            })
        }
        Err(e) => HttpResponse::InternalServerError().json(ApiResponse::<usize> {
            success: false,
            data: None,
            message: None,
            error: Some(e),
        }),
    }
}

// Stream hosts file in chunks for lazy loading
fn stream_hosts_file_chunks(chunk_size: usize, offset: usize) -> Result<Vec<HostEntry>, String> {
    let hosts_path = "/etc/hosts";
    let backup_path = "/etc/hosts.backup";
    
    // Check if hosts file is disabled (backup exists, original doesn't)
    if Path::new(backup_path).exists() && !Path::new(hosts_path).exists() {
        return Err("Hosts file is currently disabled".to_string());
    }
    
    // Check if file exists
    if !Path::new(hosts_path).exists() {
        return Err("Hosts file not found".to_string());
    }
    
    let file = File::open(hosts_path)
        .map_err(|_| "Failed to open hosts file".to_string())?;
    
    let reader = BufReader::new(file);
    let mut entries = Vec::new();
    let mut current_entry = 0;
    let start_index = offset;
    let end_index = offset + chunk_size;
    
    for (index, line) in reader.lines().enumerate() {
        if let Ok(line) = line {
            let trimmed_line = line.trim();
            
            if trimmed_line.is_empty() {
                continue;
            }
            
            let is_enabled = !trimmed_line.starts_with('#');
            let working_line = if is_enabled { trimmed_line } else { &trimmed_line[1..].trim() };
            
            if working_line.is_empty() || working_line.starts_with('#') {
                continue;
            }
            
            let parts: Vec<&str> = working_line.split_whitespace().collect();
            if parts.len() >= 2 {
                if current_entry >= start_index && current_entry < end_index {
                    let ip = parts[0];
                    let hostname = parts[1];
                    
                    // Basic validation
                    if !ip.is_empty() && !hostname.is_empty() {
                        let comment = if parts.len() > 2 {
                            Some(parts[2..].join(" "))
                        } else {
                            None
                        };
                        
                        entries.push(HostEntry {
                            id: format!("entry_{}", index),
                            ip: ip.to_string(),
                            hostname: hostname.to_string(),
                            comment,
                            enabled: is_enabled,
                            created_at: now(),
                            updated_at: now(),
                        });
                    }
                }
                current_entry += 1;
            }
        }
    }
    
    Ok(entries)
}

// GET /api/hosts/stream - Stream hosts entries in chunks for lazy loading
pub async fn stream_host_entries(req: HttpRequest) -> impl Responder {
    if !auth::validate_token(&req) {
        return HttpResponse::Unauthorized().json(ApiResponse::<Vec<HostEntry>> {
            success: false,
            data: None,
            message: None,
            error: Some("Invalid or missing API token".to_string()),
        });
    }
    
    // Get query parameters
    let chunk_size = req.query_string()
        .split('&')
        .filter_map(|pair| {
            let mut parts = pair.splitn(2, '=');
            let key = parts.next()?;
            let value = parts.next()?;
            if key == "chunk_size" { value.parse::<usize>().ok() } else { None }
        })
        .next()
        .unwrap_or(1000)
        .min(10000); // Limit chunk size to prevent memory issues
    
    let offset = req.query_string()
        .split('&')
        .filter_map(|pair| {
            let mut parts = pair.splitn(2, '=');
            let key = parts.next()?;
            let value = parts.next()?;
            if key == "offset" { value.parse::<usize>().ok() } else { None }
        })
        .next()
        .unwrap_or(0);
    
    match stream_hosts_file_chunks(chunk_size, offset) {
        Ok(entries) => {
            HttpResponse::Ok().json(ApiResponse {
                success: true,
                data: Some(entries),
                message: None,
                error: None,
            })
        }
        Err(e) => HttpResponse::InternalServerError().json(ApiResponse::<Vec<HostEntry>> {
            success: false,
            data: None,
            message: None,
            error: Some(e),
        }),
    }
}

// ===== HOSTS FILE CONTROL ENDPOINTS =====

// GET /api/etc/hosts/status - Get hosts file status
pub async fn get_hosts_status(req: HttpRequest) -> impl Responder {
    if !auth::validate_token(&req) {
        return HttpResponse::Unauthorized().json(ApiResponse::<serde_json::Value> {
            success: false,
            data: None,
            message: None,
            error: Some("Invalid or missing API token".to_string()),
        });
    }
    
    let hosts_path = "/etc/hosts";
    let disabled_path = "/etc/hosts.disabled";
    let backup_path = "/etc/hosts.backup";
    
    // Check file existence and status
    let hosts_exists = Path::new(hosts_path).exists();
    let disabled_exists = Path::new(disabled_path).exists();
    let backup_exists = Path::new(backup_path).exists();
    let is_disabled = disabled_exists && !hosts_exists;
    
    // Get file sizes if they exist
    let hosts_size = if hosts_exists {
        std::fs::metadata(hosts_path).ok().map(|m| m.len())
    } else {
        None
    };
    
    let disabled_size = if disabled_exists {
        std::fs::metadata(disabled_path).ok().map(|m| m.len())
    } else {
        None
    };
    
    let backup_size = if backup_exists {
        std::fs::metadata(backup_path).ok().map(|m| m.len())
    } else {
        None
    };
    
    HttpResponse::Ok().json(ApiResponse {
        success: true,
        data: Some(serde_json::json!({
            "disabled": is_disabled,
            "hosts_exists": hosts_exists,
            "disabled_exists": disabled_exists,
            "backup_exists": backup_exists,
            "hosts_size": hosts_size,
            "disabled_size": disabled_size,
            "backup_size": backup_size,
            "timestamp": now().to_rfc3339()
        })),
        message: None,
        error: None,
    })
}

// POST /api/etc/hosts/disable - Disable hosts file
pub async fn disable_hosts_file(req: HttpRequest) -> impl Responder {
    if !auth::validate_token(&req) {
        return HttpResponse::Unauthorized().json(ApiResponse::<serde_json::Value> {
            success: false,
            data: None,
            message: None,
            error: Some("Invalid or missing API token".to_string()),
        });
    }
    
    let hosts_path = "/etc/hosts";
    let disabled_path = "/etc/hosts.disabled";
    
    // Check if hosts file exists and is accessible
    if !Path::new(hosts_path).exists() {
        // Check if hosts.disabled file exists (already disabled)
        if Path::new(disabled_path).exists() {
            return HttpResponse::BadRequest().json(ApiResponse::<serde_json::Value> {
                success: false,
                data: None,
                message: None,
                error: Some("Hosts file is already disabled (hosts.disabled exists)".to_string()),
            });
        }
        return HttpResponse::BadRequest().json(ApiResponse::<serde_json::Value> {
            success: false,
            data: None,
            message: None,
            error: Some("Hosts file not found at /etc/hosts".to_string()),
        });
    }
    
    // Check if hosts file is readable
    if let Err(e) = std::fs::metadata(hosts_path) {
        return HttpResponse::BadRequest().json(ApiResponse::<serde_json::Value> {
            success: false,
            data: None,
            message: None,
            error: Some(format!("Cannot access hosts file: {}", e)),
        });
    }
    
    // Check if already disabled (hosts.disabled exists and hosts file doesn't)
    if Path::new(disabled_path).exists() && !Path::new(hosts_path).exists() {
        return HttpResponse::BadRequest().json(ApiResponse::<serde_json::Value> {
            success: false,
            data: None,
            message: None,
            error: Some("Hosts file is already disabled".to_string()),
        });
    }
    
    // Check if hosts.disabled file already exists (to avoid overwriting)
    if Path::new(disabled_path).exists() {
        return HttpResponse::BadRequest().json(ApiResponse::<serde_json::Value> {
            success: false,
            data: None,
            message: None,
            error: Some("Hosts file is already disabled. Please remove /etc/hosts.disabled first or enable the hosts file.".to_string()),
        });
    }
    
    // Use osascript to show native macOS authentication dialog
    let script = format!(
        "do shell script \"mv {} {}\" with administrator privileges",
        hosts_path, disabled_path
    );
    
    let output = std::process::Command::new("osascript")
        .args(&["-e", &script])
        .output();
    
    match output {
        Ok(result) => {
            if result.status.success() {
                HttpResponse::Ok().json(ApiResponse {
                    success: true,
                    data: Some(serde_json::json!({
                        "message": "Hosts file disabled successfully",
                        "timestamp": now().to_rfc3339()
                    })),
                    message: Some("Hosts file disabled".to_string()),
                    error: None,
                })
            } else {
                let error_msg = String::from_utf8_lossy(&result.stderr);
                HttpResponse::InternalServerError().json(ApiResponse::<serde_json::Value> {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(format!("Failed to disable hosts file: {}", error_msg)),
                })
            }
        }
        Err(e) => HttpResponse::InternalServerError().json(ApiResponse::<serde_json::Value> {
            success: false,
            data: None,
            message: None,
            error: Some(format!("Failed to execute command: {}", e)),
        }),
    }
}

// POST /api/etc/hosts/enable - Enable hosts file
pub async fn enable_hosts_file(req: HttpRequest) -> impl Responder {
    if !auth::validate_token(&req) {
        return HttpResponse::Unauthorized().json(ApiResponse::<serde_json::Value> {
            success: false,
            data: None,
            message: None,
            error: Some("Invalid or missing API token".to_string()),
        });
    }
    
    let hosts_path = "/etc/hosts";
    let disabled_path = "/etc/hosts.disabled";
    
    // Check if hosts.disabled file exists and is accessible
    if !Path::new(disabled_path).exists() {
        return HttpResponse::BadRequest().json(ApiResponse::<serde_json::Value> {
            success: false,
            data: None,
            message: None,
            error: Some("No disabled hosts file found at /etc/hosts.disabled".to_string()),
        });
    }
    
    // Check if hosts.disabled file is readable
    if let Err(e) = std::fs::metadata(disabled_path) {
        return HttpResponse::BadRequest().json(ApiResponse::<serde_json::Value> {
            success: false,
            data: None,
            message: None,
            error: Some(format!("Cannot access disabled hosts file: {}", e)),
        });
    }
    
    // Check if hosts file already exists
    if Path::new(hosts_path).exists() {
        return HttpResponse::BadRequest().json(ApiResponse::<serde_json::Value> {
            success: false,
            data: None,
            message: None,
            error: Some("Hosts file already exists at /etc/hosts".to_string()),
        });
    }
    
    // Use osascript to show native macOS authentication dialog
    let script = format!(
        "do shell script \"mv {} {}\" with administrator privileges",
        disabled_path, hosts_path
    );
    
    let output = std::process::Command::new("osascript")
        .args(&["-e", &script])
        .output();
    
    match output {
        Ok(result) => {
            if result.status.success() {
                HttpResponse::Ok().json(ApiResponse {
                    success: true,
                    data: Some(serde_json::json!({
                        "message": "Hosts file enabled successfully",
                        "timestamp": now().to_rfc3339()
                    })),
                    message: Some("Hosts file enabled".to_string()),
                    error: None,
                })
            } else {
                let error_msg = String::from_utf8_lossy(&result.stderr);
                HttpResponse::InternalServerError().json(ApiResponse::<serde_json::Value> {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(format!("Failed to enable hosts file: {}", error_msg)),
                })
            }
        }
        Err(e) => HttpResponse::InternalServerError().json(ApiResponse::<serde_json::Value> {
            success: false,
            data: None,
            message: None,
            error: Some(format!("Failed to execute command: {}", e)),
        }),
    }
}

// POST /api/etc/hosts/build_and_save - Build and save hosts file with enabled entries
pub async fn build_and_save_hosts_file(req: actix_web::HttpRequest) -> actix_web::HttpResponse {
    
    use std::path::Path;
    if !crate::auth::validate_token(&req) {
        return actix_web::HttpResponse::Unauthorized().json(ApiResponse::<serde_json::Value> {
            success: false,
            data: None,
            message: None,
            error: Some("Invalid or missing API token".to_string()),
        });
    }
    
    // For now, just create a basic hosts file
    let timestamp = now().to_rfc3339();
    let hosts_content = format!("# Managed by HostDNI. Last updated at: {}\n", timestamp);
    let hosts_path = "/etc/hosts";
    
    // Create a temporary file in a writable location
    let temp_dir = std::env::temp_dir();
    let temp_file = temp_dir.join("hostdni_hosts_temp");
    
    // Write content to temporary file
    if let Err(e) = std::fs::write(&temp_file, hosts_content) {
        return actix_web::HttpResponse::InternalServerError().json(ApiResponse::<serde_json::Value> {
            success: false,
            data: None,
            message: None,
            error: Some(format!("Failed to create temporary hosts file: {}", e)),
        });
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
    let _ = std::fs::remove_file(&temp_file);
    
    match output {
        Ok(result) => {
            if result.status.success() {
                actix_web::HttpResponse::Ok().json(ApiResponse {
                    success: true,
                    data: Some(serde_json::json!({
                        "message": "Hosts file built and saved successfully",
                        "timestamp": timestamp
                    })),
                    message: Some("Hosts file updated".to_string()),
                    error: None,
                })
            } else {
                let error_msg = String::from_utf8_lossy(&result.stderr);
                actix_web::HttpResponse::InternalServerError().json(ApiResponse::<serde_json::Value> {
                    success: false,
                    data: None,
                    message: None,
                    error: Some(format!("Failed to save hosts file: {}", error_msg)),
                })
            }
        }
        Err(e) => actix_web::HttpResponse::InternalServerError().json(ApiResponse::<serde_json::Value> {
            success: false,
            data: None,
            message: None,
            error: Some(format!("Failed to execute command: {}", e)),
        }),
    }
}