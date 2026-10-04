# Steganography Application

A browser-based image steganography application that uses Rust and WebAssembly to encode and decode hidden messages inside BMP images.

## 🚀 Live Demo

[Try the application](https://antriksh3036.github.io/Steganography-Application/)

## 📌 Current Version

**Version: 3.0.0**

V3 introduces a completely custom web frontend built with HTML, CSS and JavaScript, while the core steganography engine is written in Rust and compiled to WebAssembly.

## ✨ V3 Highlights

- Custom HTML/CSS/JavaScript frontend
- Rust-powered steganography engine
- WebAssembly integration
- Client-side image processing
- BMP image support
- Message capacity calculation
- Encode and decode functionality
- No backend server required

## 🛠️ Technology Stack

- **Frontend:** HTML, CSS, JavaScript
- **Core:** Rust
- **WebAssembly:** `wasm-bindgen` / `wasm-pack`
- **Hosting:** GitHub Pages

## 🔐 How It Works

The application processes the image directly in the browser:

```text
User
 ↓
HTML / CSS / JavaScript
 ↓
WebAssembly
 ↓
Rust Steganography Engine
 ↓
Encoded / Decoded Image
