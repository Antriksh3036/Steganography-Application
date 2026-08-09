import streamlit as st
import steganography_project
print(dir(steganography_project))

st.title(":blue[Steganography Tool]")

opt = st.selectbox("Choose an option",["About","Encode","Decode"])


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