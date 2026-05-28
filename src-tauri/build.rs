fn main() {
    // objc 0.2's msg_send! etc. expand to #[cfg(feature = "cargo-clippy")]
    // which is unknown in our crate. Register it as expected so rustc stops
    // warning about every msg_send! site in panel.rs.
    println!("cargo::rustc-check-cfg=cfg(feature, values(\"cargo-clippy\"))");

    tauri_build::build()
}
