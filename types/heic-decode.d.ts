// Minimal type declaration for heic-decode (ships without types).
declare module "heic-decode" {
  interface DecodedImage {
    width: number;
    height: number;
    data: Uint8ClampedArray; // RGBA
  }
  function decode(options: { buffer: Buffer | ArrayBuffer }): Promise<DecodedImage>;
  export default decode;
}
