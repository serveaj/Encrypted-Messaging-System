package com.example.securemessaging.security;

public class EncryptedMessage {

    private final String senderUsername;
    private final String receiverUsername;
    private final byte[] encryptedPayload;
    private final byte[] encryptedSessionKey;
    private final byte[] iv;
    private final byte[] signature;

    public EncryptedMessage(String senderUsername, String receiverUsername,
                            byte[] encryptedPayload, byte[] encryptedSessionKey,
                            byte[] iv, byte[] signature) {
        this.senderUsername     = senderUsername;
        this.receiverUsername   = receiverUsername;
        this.encryptedPayload   = encryptedPayload;
        this.encryptedSessionKey = encryptedSessionKey;
        this.iv                 = iv;
        this.signature          = signature;
    }

    public String getSenderUsername()      { return senderUsername; }
    public String getReceiverUsername()    { return receiverUsername; }
    public byte[] getEncryptedPayload()    { return encryptedPayload; }
    public byte[] getEncryptedSessionKey() { return encryptedSessionKey; }
    public byte[] getIv()                  { return iv; }
    public byte[] getSignature()           { return signature; }
}
