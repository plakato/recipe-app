// Minimal type declaration for heic-convert (ships without types).
declare module "heic-convert" {
  interface ConvertOptions {
    buffer: Buffer;
    format: "JPEG" | "PNG";
    quality?: number; // 0..1, JPEG only
  }
  function convert(options: ConvertOptions): Promise<ArrayBuffer>;
  export default convert;
}
