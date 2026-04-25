package com.example.securemessaging.security;

import javax.crypto.Cipher;
import java.security.interfaces.RSAPublicKey;

public class RSAService {

    public byte[] encrypt(byte[] data, RSAPublicKey publicKey) throws Exception {
        Cipher cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding");
        cipher.init(Cipher.ENCRYPT_MODE, publicKey);
        return cipher.doFinal(data);
    }
}
