package com.example.securemessaging.security;

import com.example.securemessaging.service.KmsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.security.interfaces.RSAPublicKey;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class HybridEncryptionService {

    private final AESService aesService = new AESService();
    private final RSAService rsaService = new RSAService();

    @Autowired
    private KmsService kmsService;

    // Direct message encryption
    public EncryptedMessage encrypt(String message,
                                    String senderUsername,
                                    String senderSigningKeyId,
                                    String receiverUsername,
                                    String receiverEncryptionKeyId) throws Exception {

        SecretKey sessionKey = aesService.generateSessionKey();
        byte[] iv  = aesService.generateIV();
        byte[] aad = (senderUsername + receiverUsername).getBytes();

        byte[] encryptedPayload    = aesService.encrypt(message, sessionKey, iv, aad);
        RSAPublicKey receiverKey   = (RSAPublicKey) kmsService.getPublicKey(receiverEncryptionKeyId);
        byte[] encryptedSessionKey = rsaService.encrypt(sessionKey.getEncoded(), receiverKey);
        byte[] dataToSign          = combine(encryptedPayload, iv, encryptedSessionKey);
        byte[] signature           = kmsService.signMessage(senderSigningKeyId, dataToSign);

        return new EncryptedMessage(senderUsername, receiverUsername,
                encryptedPayload, encryptedSessionKey, iv, signature);
    }

    // Direct message decryption
    public String decrypt(EncryptedMessage msg,
                          String receiverEncryptionKeyId,
                          String senderSigningKeyId) throws Exception {

        byte[] dataToVerify = combine(msg.getEncryptedPayload(), msg.getIv(), msg.getEncryptedSessionKey());
        if (!kmsService.verify(senderSigningKeyId, dataToVerify, msg.getSignature())) {
            throw new SecurityException("Signature verification failed — message may have been tampered with.");
        }

        byte[] sessionKeyBytes = kmsService.decrypt(msg.getEncryptedSessionKey(), receiverEncryptionKeyId);
        SecretKey sessionKey   = new SecretKeySpec(sessionKeyBytes, "AES");
        byte[] aad             = (msg.getSenderUsername() + msg.getReceiverUsername()).getBytes();

        return aesService.decrypt(msg.getEncryptedPayload(), sessionKey, msg.getIv(), aad);
    }

    // Group message encryption — one AES key, encrypted separately for each member
    public Map<String, Object> encryptForGroup(String message,
                                               String senderUsername,
                                               String senderSigningKeyId,
                                               String groupId,
                                               List<Map<String, String>> members) throws Exception {

        SecretKey sessionKey = aesService.generateSessionKey();
        byte[] iv  = aesService.generateIV();
        byte[] aad = (senderUsername + groupId).getBytes();

        byte[] encryptedPayload = aesService.encrypt(message, sessionKey, iv, aad);
        byte[] dataToSign       = combine(encryptedPayload, iv);
        byte[] signature        = kmsService.signMessage(senderSigningKeyId, dataToSign);

        // Encrypt the session key once per member using their RSA public key
        Map<String, String> memberKeys = new HashMap<>();
        for (Map<String, String> member : members) {
            String username        = member.get("username");
            String encryptionKeyId = member.get("encryptionKeyId");
            RSAPublicKey publicKey = (RSAPublicKey) kmsService.getPublicKey(encryptionKeyId);
            byte[] encSessionKey   = rsaService.encrypt(sessionKey.getEncoded(), publicKey);
            memberKeys.put(username, Base64.getEncoder().encodeToString(encSessionKey));
        }

        Map<String, Object> result = new HashMap<>();
        result.put("encryptedPayload", Base64.getEncoder().encodeToString(encryptedPayload));
        result.put("iv",               Base64.getEncoder().encodeToString(iv));
        result.put("signature",        Base64.getEncoder().encodeToString(signature));
        result.put("memberKeys",       memberKeys);
        return result;
    }

    // Group message decryption — receiver provides their own encrypted session key
    public String decryptGroup(String senderUsername,
                               String senderSigningKeyId,
                               String groupId,
                               String receiverUsername,
                               String receiverEncryptionKeyId,
                               byte[] encryptedPayload,
                               byte[] encryptedSessionKey,
                               byte[] iv,
                               byte[] signature) throws Exception {

        byte[] dataToVerify = combine(encryptedPayload, iv);
        if (!kmsService.verify(senderSigningKeyId, dataToVerify, signature)) {
            throw new SecurityException("Signature verification failed — group message may have been tampered with.");
        }

        byte[] sessionKeyBytes = kmsService.decrypt(encryptedSessionKey, receiverEncryptionKeyId);
        SecretKey sessionKey   = new SecretKeySpec(sessionKeyBytes, "AES");
        byte[] aad             = (senderUsername + groupId).getBytes();

        return aesService.decrypt(encryptedPayload, sessionKey, iv, aad);
    }

    private byte[] combine(byte[]... arrays) {
        int total = 0;
        for (byte[] a : arrays) total += a.length;
        byte[] result = new byte[total];
        int pos = 0;
        for (byte[] a : arrays) {
            System.arraycopy(a, 0, result, pos, a.length);
            pos += a.length;
        }
        return result;
    }
}
