package com.example.securemessaging.service;

import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.kms.KmsClient;
import software.amazon.awssdk.services.kms.model.*;

import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.X509EncodedKeySpec;

@Service
public class KmsService {

    private final KmsClient kmsClient;

    public KmsService() {
        this.kmsClient = KmsClient.builder()
            .region(Region.US_EAST_1)
            .credentialsProvider(DefaultCredentialsProvider.create())
            .build();
    }

    public String createEncryptionKey() {
        return kmsClient.createKey(
            CreateKeyRequest.builder()
                .keyUsage(KeyUsageType.ENCRYPT_DECRYPT)
                .keySpec(KeySpec.RSA_2048)
                .build()
        ).keyMetadata().keyId();
    }

    public String createSigningKey() {
        return kmsClient.createKey(
            CreateKeyRequest.builder()
                .keyUsage(KeyUsageType.SIGN_VERIFY)
                .keySpec(KeySpec.RSA_2048)
                .build()
        ).keyMetadata().keyId();
    }

    public PublicKey getPublicKey(String keyId) throws Exception {
        GetPublicKeyResponse response = kmsClient.getPublicKey(
            GetPublicKeyRequest.builder().keyId(keyId).build()
        );
        X509EncodedKeySpec spec = new X509EncodedKeySpec(response.publicKey().asByteArray());
        return KeyFactory.getInstance("RSA").generatePublic(spec);
    }

    public byte[] decrypt(byte[] encryptedData, String keyId) {
        return kmsClient.decrypt(
            DecryptRequest.builder()
                .keyId(keyId)
                .ciphertextBlob(SdkBytes.fromByteArray(encryptedData))
                .encryptionAlgorithm(EncryptionAlgorithmSpec.RSAES_OAEP_SHA_256)
                .build()
        ).plaintext().asByteArray();
    }

    public byte[] signMessage(String keyId, byte[] message) {
        return kmsClient.sign(
            SignRequest.builder()
                .keyId(keyId)
                .message(SdkBytes.fromByteArray(message))
                .signingAlgorithm(SigningAlgorithmSpec.RSASSA_PSS_SHA_256)
                .build()
        ).signature().asByteArray();
    }

    public boolean verify(String keyId, byte[] message, byte[] signature) {
        return kmsClient.verify(
            VerifyRequest.builder()
                .keyId(keyId)
                .message(SdkBytes.fromByteArray(message))
                .signature(SdkBytes.fromByteArray(signature))
                .signingAlgorithm(SigningAlgorithmSpec.RSASSA_PSS_SHA_256)
                .build()
        ).signatureValid();
    }
}
