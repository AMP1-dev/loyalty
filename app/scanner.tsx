// app/scanner.tsx

import { CameraView, useCameraPermissions } from 'expo-camera';
import { Text, View } from 'react-native';

export default function Scanner() {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) return <View />;
  if (!permission.granted) {
    requestPermission();
    return <Text>Precisamos da câmera</Text>;
  }

  return (
    <CameraView
      style={{ flex: 1 }}
      barcodeScannerSettings={{
        barcodeTypes: ['qr'],
      }}
      onBarcodeScanned={(event) => {
        console.log(event.data);
        // redireciona para login com loja_id
      }}
    />
  );
}