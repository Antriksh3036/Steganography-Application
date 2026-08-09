import streamlit as st
import steganography_project
print(dir(steganography_project))

st.title(":blue[Steganography Tool]")

opt = st.selectbox("Choose an option",["About","Encode","Decode"])

if opt == "About":
    st.header(":green[About]")

    st.markdown("""
    ## 🔐 BMP Steganography

    This application allows you to **hide text messages inside BMP images**
    using **Least Significant Bit (LSB) steganography**.

    ### How does it work?

    The message is converted into its binary representation. The application
    then modifies the **least significant bit** of the image's pixel bytes
    to store the message.

    Since only the least significant bit is modified, the changes are
    visually negligible to the human eye.

    ### Architecture

    This project uses two languages:

    - **Python + Streamlit** — User interface and file handling
    - **Rust + PyO3** — Steganography engine and byte-level processing

    The uploaded BMP image is passed from Python to Rust as raw bytes.
    Rust performs the encoding or decoding and returns the resulting data
    back to Python.

    ### Encoding

    ```text
    Text Message
          ↓
    UTF-8 Bytes
          ↓
    Binary Representation
          ↓
    LSB Modification
          ↓
    Encoded BMP
    ```

    ### Decoding

    ```text
    Encoded BMP
          ↓
    Extract LSBs
          ↓
    Reconstruct Bytes
          ↓
    UTF-8 Decoding
          ↓
    Original Message
    ```

    ### Why Rust?

    Rust provides efficient and memory-safe low-level byte manipulation,
    making it well suited for processing image data.

    Python handles the interface while Rust handles the computational core.

    ### ⚠️ Current Limitations

    - Currently supports **BMP images**.
    - The current implementation assumes the pixel data begins at a
      standard BMP offset.
    - The hidden message must fit within the available image capacity.
    - This project is intended for educational purposes and should not
      be considered a secure encryption system.

    ### 🛠️ Built With

    **Python · Streamlit · Rust · PyO3 · Maturin**
    """)

if opt == "Encode":
    uploaded_file = st.file_uploader("Input the image",type="bmp")

    msg = st.text_input("Enter the message you want to encode")
    if uploaded_file is not None:
        st.image(uploaded_file)

        if st.button("Encode"):
            img = uploaded_file.getvalue()
            with st.spinner("Encoding...", show_time=True):
                encoded = steganography_project.encode(msg,img)
            st.success("Done!")
            st.download_button("Download Encoded Image",data=encoded,file_name="encoded.bmp",mime="image/bmp")
            

if opt == "Decode": 
    uploaded_file = st.file_uploader("Input the image",type="bmp")

    if uploaded_file is not None:
        st.image(uploaded_file)
    
        if st.button("Decode"):
            img = uploaded_file.getvalue()
            with st.spinner("Decoding...", show_time=True):
                decoded = steganography_project.decode(img)
            st.success("Done!")
            st.code(decoded,language=None)
