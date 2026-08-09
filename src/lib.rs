use pyo3::prelude::*;



fn change(img_bytes:&mut Vec<u8>, x:u8, a:usize){
    if x == 0 {
        img_bytes[a] &= 0b11111110;
    }
    else if x == 1{
        img_bytes[a] |= 0b00000001;
    }
    
    
}

#[pyfunction]
fn encode(msg:String,img:Vec<u8>) -> PyResult<Vec<u8>> {

    //Safety Checks
    let msg_bytes = msg.as_bytes();
    let required = ( msg_bytes.len() * 8 ) + 32 ;// number of bytes needed
    let available = img.len()-54; // number of image bytes available
    
    if required > available {
        return Err(pyo3::exceptions::PyValueError::new_err("Message is too large for this image"));
    }
    
    
    
    
    let mut img_bytes = img;
    
    //Encoding Message length
    let msg_len = msg_bytes.len() as u32;
    let mut a = 54;
    for i in (0..32).rev(){
        let msg_len_bit = ((msg_len >> i) & 1) as u8;
        change(&mut img_bytes, msg_len_bit, a); // Storing Message length
        a += 1;
    }
    
    
    //Encoding Message
    let ascii: &[u8] = msg.as_bytes();
    for i in ascii{
        for m in (0..8).rev(){
            let x: u8 = (i >> m) & 1;
            change(&mut img_bytes, x, a);
            a = a + 1;
        }
    }
    Ok(img_bytes)
}




#[pyfunction]
fn decode(img: Vec<u8>) -> PyResult<String> {
    
    let img_bytes = img;
    let mut ind = 54;
    
    //Retrieving message length
    let msg_len: usize ;
    let mut msg_len_bit: usize = 0b00000000;
    for _ in (0..32).rev(){
        let bit = img_bytes[ind] & 1;
        msg_len_bit = (msg_len_bit << 1) | bit as usize;
        ind += 1;
    }
    msg_len = msg_len_bit;
    
    //Decoding the Message
    let mut decoded_bytes: Vec<u8> = Vec::new();
    
    let mut itr = 0;
    let mut msg_bit = 0b00000000;
    while itr != msg_len{
        for _ in (0..8).rev(){
            let bit = img_bytes[ind] & 1;
            msg_bit = (msg_bit << 1) | bit;
            ind += 1;
        }
        decoded_bytes.push(msg_bit);
        msg_bit = 0b00000000;
        
        itr += 1;
    }
    let decoded_msg = String::from_utf8(decoded_bytes).map_err(|e| pyo3::exceptions::PyValueError::new_err(e.to_string()))?;
    
    Ok(decoded_msg)
    
    
    
}



#[pymodule]
mod steganography_project {
    use super::*;

    #[pymodule_export]
    use super::encode;

    #[pymodule_export]
    use super::decode;
}