// API Token Auth System for HostDNI
// - No user/password logic
// - Random API token generated at startup and rotated every 10 minutes
// - /api/auth/token returns the current token
// - All protected endpoints require Authorization: Bearer <token>
// - 1-minute grace period for previous token after rotation
// - Responds 401 if token is missing/invalid

use actix_web::{HttpRequest, HttpResponse, Responder};
use actix_web::http::header;
use serde::Serialize;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use once_cell::sync::Lazy;
use rand::{thread_rng, Rng};
use rand::distributions::Alphanumeric;
use std::thread;

// Token rotation interval and grace period
const TOKEN_ROTATION_INTERVAL_SECS: u64 = 600; // 10 minutes
const TOKEN_GRACE_PERIOD_SECS: u64 = 60; // 1 minute

// Global token state
struct TokenState {
    current_token: String,
    previous_token: Option<String>,
    last_rotation: Instant,
}

static TOKEN_STATE: Lazy<Arc<Mutex<TokenState>>> = Lazy::new(|| {
    Arc::new(Mutex::new(TokenState {
        current_token: generate_token(),
        previous_token: None,
        last_rotation: Instant::now(),
    }))
});

fn generate_token() -> String {
    thread_rng().sample_iter(&Alphanumeric).take(32).map(char::from).collect()
}

// Start token rotation in a background thread
pub fn start_token_rotation() {
    let token_state = TOKEN_STATE.clone();
    thread::spawn(move || loop {
        thread::sleep(Duration::from_secs(TOKEN_ROTATION_INTERVAL_SECS));
        let mut state = token_state.lock().unwrap();
        state.previous_token = Some(state.current_token.clone());
        state.current_token = generate_token();
        state.last_rotation = Instant::now();
        println!("[HostDNI] API token rotated");
    });
}

// API: Get current token
#[derive(Serialize)]
struct TokenResponse {
    token: String,
    expires_in: u64, // seconds until next rotation
}

pub async fn get_token() -> impl Responder {
    let state = TOKEN_STATE.lock().unwrap();
    let expires_in = TOKEN_ROTATION_INTERVAL_SECS - state.last_rotation.elapsed().as_secs().min(TOKEN_ROTATION_INTERVAL_SECS);
    HttpResponse::Ok().json(TokenResponse {
        token: state.current_token.clone(),
        expires_in,
    })
}

// Middleware: Validate token (accepts current or previous token during grace period)
pub fn validate_token(req: &HttpRequest) -> bool {
    let token = req.headers()
        .get(header::AUTHORIZATION)
        .and_then(|h| h.to_str().ok())
        .and_then(|s| s.strip_prefix("Bearer "));
    if let Some(token) = token {
        let state = TOKEN_STATE.lock().unwrap();
        if token == state.current_token {
            return true;
        }
        if let Some(prev) = &state.previous_token {
            if token == prev && state.last_rotation.elapsed().as_secs() < TOKEN_GRACE_PERIOD_SECS {
                return true;
            }
        }
    }
    false
} 