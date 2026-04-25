package com.example.securemessaging.controller;

import com.example.securemessaging.dto.DecryptGroupRequest;
import com.example.securemessaging.dto.DecryptRequest;
import com.example.securemessaging.dto.EncryptGroupRequest;
import com.example.securemessaging.dto.EncryptRequest;
import com.example.securemessaging.security.EncryptedMessage;
import com.example.securemessaging.security.HybridEncryptionService;
import com.example.securemessaging.service.KmsService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Base64;
import java.util.Map;

@RestController
@RequestMapping("/crypto")
public class CryptoController {

    @Autowired
    private KmsService kmsService;

    @Autowired
    private HybridEncryptionService encryptionService;

    // Called when a new user registers and creates their KMS key pair
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, String> body) {
        try {
            String encryptionKeyId = kmsService.createEncryptionKey();
            String signingKeyId    = kmsService.createSigningKey();
            return ResponseEntity.ok(Map.of(
                "encryptionKeyId", encryptionKeyId,
                "signingKeyId",    signingKeyId
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // Called before saving a message and returns base64 encoded encrypted fields
    @PostMapping("/encrypt")
    public ResponseEntity<?> encrypt(@RequestBody EncryptRequest req) {
        try {
            EncryptedMessage result = encryptionService.encrypt(
                req.getMessage(),
                req.getSenderUsername(),
                req.getSenderSigningKeyId(),
                req.getReceiverUsername(),
                req.getReceiverEncryptionKeyId()
            );
            return ResponseEntity.ok(Map.of(
                "encryptedPayload",    Base64.getEncoder().encodeToString(result.getEncryptedPayload()),
                "encryptedSessionKey", Base64.getEncoder().encodeToString(result.getEncryptedSessionKey()),
                "iv",                  Base64.getEncoder().encodeToString(result.getIv()),
                "signature",           Base64.getEncoder().encodeToString(result.getSignature())
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // Called when fetching messages and returns plaintext
    @PostMapping("/decrypt")
    public ResponseEntity<?> decrypt(@RequestBody DecryptRequest req) {
        try {
            EncryptedMessage msg = new EncryptedMessage(
                req.getSenderUsername(),
                req.getReceiverUsername(),
                Base64.getDecoder().decode(req.getEncryptedPayload()),
                Base64.getDecoder().decode(req.getEncryptedSessionKey()),
                Base64.getDecoder().decode(req.getIv()),
                Base64.getDecoder().decode(req.getSignature())
            );
            String plaintext = encryptionService.decrypt(
                msg,
                req.getReceiverEncryptionKeyId(),
                req.getSenderSigningKeyId()
            );
            return ResponseEntity.ok(Map.of("plaintext", plaintext));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // Encrypts a group message and session key is encrypted separately for each member
    @PostMapping("/encrypt-group")
    public ResponseEntity<?> encryptGroup(@RequestBody EncryptGroupRequest req) {
        try {
            Map<String, Object> result = encryptionService.encryptForGroup(
                req.getMessage(),
                req.getSenderUsername(),
                req.getSenderSigningKeyId(),
                req.getGroupId(),
                req.getMembers()
            );
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    // Decrypts a group message using the receiver's copy of the session key
    @PostMapping("/decrypt-group")
    public ResponseEntity<?> decryptGroup(@RequestBody DecryptGroupRequest req) {
        try {
            String plaintext = encryptionService.decryptGroup(
                req.getSenderUsername(),
                req.getSenderSigningKeyId(),
                req.getGroupId(),
                req.getReceiverUsername(),
                req.getReceiverEncryptionKeyId(),
                Base64.getDecoder().decode(req.getEncryptedPayload()),
                Base64.getDecoder().decode(req.getEncryptedSessionKey()),
                Base64.getDecoder().decode(req.getIv()),
                Base64.getDecoder().decode(req.getSignature())
            );
            return ResponseEntity.ok(Map.of("plaintext", plaintext));
        } catch (SecurityException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
