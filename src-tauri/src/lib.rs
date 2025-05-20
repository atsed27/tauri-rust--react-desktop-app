use aes_gcm::aead::{Aead, KeyInit, OsRng};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use base64::{decode, encode};
use rand::RngCore;
use tauri_plugin_sql::{Migration, MigrationKind};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn generate_key() -> String {
    let mut key = [0u8; 32];
    OsRng.fill_bytes(&mut key);
    encode(key)
}

#[tauri::command]
fn encrypt_data(data: String, key: String) -> Result<String, String> {
    let key_bytes = decode(&key).map_err(|e| format!("Failed to decode key: {}", e))?;
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);

    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let cipher = Aes256Gcm::new(key);
    match cipher.encrypt(nonce, data.as_bytes()) {
        Ok(ciphertext) => {
            let mut encrypted_data = nonce_bytes.to_vec();
            encrypted_data.extend(ciphertext);
            Ok(encode(encrypted_data))
        }
        Err(e) => Err(format!("Encryption failed: {}", e)),
    }
}

#[tauri::command]
fn decrypt_data(encrypted_data: String, key: String) -> Result<String, String> {
    let key_bytes = decode(&key).map_err(|e| format!("Failed to decode key: {}", e))?;
    let encrypted_data_bytes =
        decode(&encrypted_data).map_err(|e| format!("Failed to decode encrypted data: {}", e))?;

    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);

    if encrypted_data_bytes.len() < 12 {
        return Err("Invalid encrypted data".to_string());
    }
    let (nonce_bytes, ciphertext) = encrypted_data_bytes.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let cipher = Aes256Gcm::new(key);
    match cipher.decrypt(nonce, ciphertext) {
        Ok(plaintext) => Ok(String::from_utf8(plaintext).map_err(|e| format!("Invalid UTF-8: {}", e))?),
        Err(e) => Err(format!("Decryption failed: {}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create users table",
            sql: r#"
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT,
                    amount TEXT
                )
            "#,
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:test3.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            generate_key,
            encrypt_data,
            decrypt_data
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}
