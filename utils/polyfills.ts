// Polyfills for React Native environment

// Base64 encoding/decoding polyfills
if (typeof global.btoa === 'undefined') {
  global.btoa = (str: string) => {
    return Buffer.from(str, 'utf-8').toString('base64');
  };
}

if (typeof global.atob === 'undefined') {
  global.atob = (str: string) => {
    return Buffer.from(str, 'base64').toString('utf-8');
  };
}

export {};

