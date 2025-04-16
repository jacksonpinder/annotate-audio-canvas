
// Add this file to the project to help with module type declarations
declare module 'react-pdf' {
  export const Document: any;
  export const Page: any;
  export const pdfjs: any;
}

declare module 'roughjs/bundled/rough.esm' {
  const rough: any;
  export default rough;
}
