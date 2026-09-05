import streamlit as st
import steganography_project
print(dir(steganography_project))

st.title(":blue[Steganography Tool]:red[ v2.0]")

opt = st.selectbox("Choose an option",["About","Encode","Decode","Sample Images"])

if opt == "About":
    st.set_page_config(layout="centered")
    
    with st.expander(":yellow[Changes]"):
      st.code('''👉Sample bmp images added \n 🔹12 sample bmp images have been added in a new sample image option''',language="markdown")
      st.code('''👉Now the app accepts non-standard bmp images as well]\n 🔹The app can accept bmp files of any header/offset value by direcly calculating the header itself''',language="markdown",wrap_lines=True)
      st.code('''👉Some minor changes\n 🔹Available message size and no. of pixels will be shown''',language="markdown")
    
    st.header(":green[About]")
    st.markdown("""
    ## 🔐 :red[BMP Steganography]

    This application allows you to **hide text messages inside BMP images**
    using **Least Significant Bit (LSB) steganography**.

    ### :yellow[How does it work?]

    The message is converted into its binary representation. The application
    then modifies the **least significant bit** of the image's pixel bytes
    to store the message.

    Since only the least significant bit is modified, the changes are
    visually negligible to the human eye.

    ### :yellow[Architecture]

    This project uses two languages:

    - **Python + Streamlit** — User interface and file handling
    - **Rust + PyO3** — Steganography engine and byte-level processing

    The uploaded BMP image is passed from Python to Rust as raw bytes.
    Rust performs the encoding or decoding and returns the resulting data
    back to Python.

    ### :yellow[Encoding]

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

    ### :yellow[Decoding]

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

    ### :yellow[Why Rust?]

    Rust provides efficient and memory-safe low-level byte manipulation,
    making it well suited for processing image data.

    Python handles the interface while Rust handles the computational core.

    ### :yellow[⚠️ Current Limitations]

    - Currently supports **BMP images**.
    - The hidden message must fit within the available image capacity.
    - This project is intended for educational purposes and should not
      be considered a secure encryption system.

    ### :yellow[🛠️ Built With]

    **Python · Streamlit · Rust · PyO3 · Maturin**
    """)

if opt == "Encode":
    uploaded_file = st.file_uploader("Input the image",type=["bmp", "application/octet-stream"])

    msg = st.text_input("Enter the message you want to encode")
    if uploaded_file is not None:
        available_space = steganography_project.size(uploaded_file.getvalue())
        pixels = available_space*8
        st.markdown(f":red[Number of pixels = {pixels}]")
        st.markdown(f":blue[Available size for the message = {available_space}]")
        st.image(uploaded_file)

        if st.button("Encode"):
            img = uploaded_file.getvalue()
            with st.spinner("Encoding...", show_time=True):
                encoded = steganography_project.encode(msg,img)
                offset = steganography_project.offset(img)
            st.success("Done!")
            st.download_button("Download Encoded Image",data=encoded,file_name="encoded.bmp",mime="image/bmp")

      
            

if opt == "Decode": 
    uploaded_file = st.file_uploader("Input the image",type=["bmp", "application/octet-stream"])

    if uploaded_file is not None:
        st.image(uploaded_file)
    
        if st.button("Decode"):
            img = uploaded_file.getvalue()
            with st.spinner("Decoding...", show_time=True):
                decoded = steganography_project.decode(img)
            st.success("Done!")
            st.code(decoded,language=None)

if opt == "Sample Images":
      st.set_page_config(layout="wide")
      col1,col2,col3 = st.columns([1,1,1],gap="large")
      with col1:
            st.image("sample_images/boat_dock.bmp",caption="Boat dock")
            with open("sample_images/boat_dock.bmp","rb") as file:
                  st.download_button(
                        label="Download",
                        data=file,
                        file_name="sample_image.bmp",
                        mime="image/bmp",
                        key="Boat Dock"
                  )
            st.space(size="large")
            st.image("sample_images/city_night.bmp",caption="City Night")
            with open("sample_images/city_night.bmp","rb") as file:
                  st.download_button(
                        label="Download",
                        data=file,
                        file_name="sample_image.bmp",
                        mime="image/bmp",
                        key="city_night"
                  )
            st.space(size="large")
            st.image("sample_images/forest_path.bmp",caption="Forest Path")
            with open("sample_images/forest_path.bmp","rb") as file:
                  st.download_button(
                        label="Download",
                        data=file,
                        file_name="sample_image.bmp",
                        mime="image/bmp",
                        key="forest_path"
                  )
            st.space(size="large")
            st.image("sample_images/village_river.bmp",caption="Village River")
            with open("sample_images/village_river.bmp","rb") as file:
                  st.download_button(
                        label="Download",
                        data=file,
                        file_name="sample_image.bmp",
                        mime="image/bmp",
                        key="village_river"
                  )
      with col2:
            st.image("sample_images/book_coffee.bmp",caption="Book Coffee")
            with open("sample_images/book_coffee.bmp","rb") as file:
                  st.download_button(
                        label="Download",
                        data=file,
                        file_name="sample_image.bmp",
                        mime="image/bmp",
                        key="Book Coffee"
                  )
            st.space(size="large")
            st.image("sample_images/lighthouse.bmp",caption="Light House")
            with open("sample_images/lighthouse.bmp","rb") as file:
                  st.download_button(
                        label="Download",
                        data=file,
                        file_name="sample_image.bmp",
                        mime="image/bmp",
                        key="lighthouse"
                  )
            st.space(size="large")
            st.image("sample_images/lonely_tree.bmp",caption="Lonely Tree")
            with open("sample_images/lonely_tree.bmp","rb") as file:
                  st.download_button(
                        label="Download",
                        data=file,
                        file_name="sample_image.bmp",
                        mime="image/bmp",
                        key="lonely_tree"
                  )
            st.space(size="large")
            st.image("sample_images/waterfall.bmp",caption="Waterfall")
            with open("sample_images/waterfall.bmp","rb") as file:
                  st.download_button(
                        label="Download",
                        data=file,
                        file_name="sample_image.bmp",
                        mime="image/bmp",
                        key="waterfall"
                  )
      with col3:
            st.image("sample_images/butterfly.bmp",caption="Butterfly")
            with open("sample_images/butterfly.bmp","rb") as file:
                  st.download_button(
                        label="Download",
                        data=file,
                        file_name="sample_image1.bmp",
                        mime="image/bmp",
                        key="Butterfly"
                  )
            st.space(size="large")
            st.image("sample_images/mountain_lake.bmp",caption="Mountain Lake")
            with open("sample_images/mountain_lake.bmp","rb") as file:
                  st.download_button(
                        label="Download",
                        data=file,
                        file_name="sample_image.bmp",
                        mime="image/bmp",
                        key="mountain_lake"
                  )
            st.space(size="large")
            st.image("sample_images/sunset_beach.bmp",caption="Sunset Beach")
            with open("sample_images/sunset_beach.bmp","rb") as file:
                  st.download_button(
                        label="Download",
                        data=file,
                        file_name="sample_image.bmp",
                        mime="image/bmp",
                        key="sunset_beach"
                  )
            st.space(size="large")
            st.image("sample_images/winding_road.bmp",caption="Winding Road")
            with open("sample_images/winding_road.bmp","rb") as file:
                  st.download_button(
                        label="Download",
                        data=file,
                        file_name="sample_image.bmp",
                        mime="image/bmp",
                        key="winding_road"
                  )
      