use keyring::Entry;

const SERVICE: &str = "com.ghast.app";
const ACCOUNT: &str = "github_pat";

fn entry() -> Result<Entry, String> {
    Entry::new(SERVICE, ACCOUNT).map_err(|e| format!("keychain entry: {e}"))
}

pub fn load_pat() -> Result<Option<String>, String> {
    let e = entry()?;
    match e.get_password() {
        Ok(p) => Ok(Some(p)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(err) => Err(format!("keychain read: {err}")),
    }
}

pub fn save_pat(pat: &str) -> Result<(), String> {
    entry()?
        .set_password(pat)
        .map_err(|e| format!("keychain write: {e}"))
}

#[allow(dead_code)]
pub fn delete_pat() -> Result<(), String> {
    let e = entry()?;
    match e.delete_credential() {
        Ok(()) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(err) => Err(format!("keychain delete: {err}")),
    }
}
