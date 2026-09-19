/* @ts-self-types="./steganography_project.d.ts" */
import * as wasm from "./steganography_project_bg.wasm";
import { __wbg_set_wasm } from "./steganography_project_bg.js";

__wbg_set_wasm(wasm);
wasm.__wbindgen_start();
export {
    decode, encode, offset, size
} from "./steganography_project_bg.js";
