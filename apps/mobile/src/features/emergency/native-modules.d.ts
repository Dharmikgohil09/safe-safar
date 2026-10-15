// These libraries ship without TypeScript types.

declare module 'react-native-get-sms-android' {
  const SmsAndroid: {
    autoSend(
      phoneNumber: string,
      message: string,
      onFail: (error: unknown) => void,
      onSuccess: (...args: unknown[]) => void,
    ): void;
  };
  export default SmsAndroid;
}

declare module 'react-native-immediate-phone-call' {
  const mod: any;
  export default mod;
  export const immediatePhoneCall: any;
}
