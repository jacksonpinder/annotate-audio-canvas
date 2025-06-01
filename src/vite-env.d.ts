/// <reference types="vite/client" />

declare module '*?worklet' {
    const workerConstructor: {
      new (): Worker;
    };
    export default workerConstructor;
  }