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
fn size(img:Vec<u8>) -> PyResult<usize> {

    //Getting Bmp offset
    let mut offset: usize = 0;
    let mut pow_of_256: u32 = 0;

    for i in 10..14{
        let byte_result;
        let j: usize = img[i] as usize;
        byte_result = j * (256usize.pow(pow_of_256));
        pow_of_256 += 1;
        offset += byte_result;
    
    }
    let available = (img.len()-offset)/8; // number of image bytes available

    Ok(available)
}

#[pyfunction]
fn encode(msg:String,img:Vec<u8>) -> PyResult<Vec<u8>> {

    //Getting Bmp offset
    let mut offset: usize = 0;
    let mut pow_of_256: u32 = 0;

    for i in 10..14{
        let byte_result;
        let j: usize = img[i] as usize;
        byte_result = j * (256usize.pow(pow_of_256));
        pow_of_256 += 1;
        offset += byte_result;
    
    }



    //Safety Checks
    let msg_bytes = msg.as_bytes();
    let required = ( msg_bytes.len() * 8 ) + 32 ;// number of bytes needed
    let available = img.len()-offset; // number of image bytes available
    
    if required > available {
        return Err(pyo3::exceptions::PyValueError::new_err("Message is too large for this image"));
    }
    
    
    
    let mut img_bytes = img;
    
    //Encoding Message length
    let msg_len = msg_bytes.len() as u32;
    let mut a = offset;
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

    //Getting Bmp offset
    let mut offset: usize = 0;
    let mut pow_of_256: u32 = 0;

    for i in 10..14{
        let byte_result;
        let j: usize = img[i] as usize;
        byte_result = j * (256usize.pow(pow_of_256));
        pow_of_256 += 1;
        offset += byte_result;
    
    } 
    
    let img_bytes = img;
    let mut ind = offset;
    
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


#[pyfunction]
fn offset(img: Vec<u8>) -> PyResult<usize> {
        //Getting Bmp offset
    let mut offset: usize = 0;
    let mut pow_of_256: u32 = 0;

    for i in 10..14{
        let byte_result;
        let j: usize = img[i] as usize;
        byte_result = j * (256usize.pow(pow_of_256));
        pow_of_256 += 1;
        offset += byte_result;
    
    } 
    Ok(offset)
}

#[pymodule]
mod steganography_project {
    // use super::*;

    #[pymodule_export]
    use super::encode;

    #[pymodule_export]
    use super::decode;

    #[pymodule_export]
    use super::offset;

    #[pymodule_export]
    use super::size;
}