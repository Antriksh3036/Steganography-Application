# 🕵️ Steganography Tool

A web app to hide and extract secret messages inside images, built with a
Python UI and a Rust-powered backend for the actual encode/decode logic.

## How it works
- **Frontend**: [Streamlit](https://streamlit.io) — upload a BMP image, type a
  message, and encode it invisibly into the image's pixel data.
- **Backend**: Rust, exposed to Python via [PyO3](https://pyo3.rs) and built
  with [maturin](https://www.maturin.rs/) — handles the actual bit-level
  encoding/decoding for speed and safety.

## Features
- 🔒 Encode a text message into a BMP image
- 🔓 Decode a hidden message back out of an image
- ⬇️ Download the encoded image directly from the browser
- ⚡ Core logic runs in compiled Rust, not pure Python

## Tech stack
`Python` · `Streamlit` · `Rust` · `PyO3` · `maturin`

## Running locally
```bash
# Build the Rust extension
maturin develop --release

# Run the app
streamlit run pycode.py
```

## Live demo
https://hideinimages.streamlit.app/

## Why Rust for this?
Steganography involves manipulating raw pixel/byte data — exactly the kind
of tight, low-level loop where Rust's performance and memory safety pay off
compared to pure Python, while Streamlit keeps the UI simple to build and use.
