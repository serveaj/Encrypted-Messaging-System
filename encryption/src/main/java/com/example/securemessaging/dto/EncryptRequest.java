package com.example.securemessaging.dto;

public class EncryptRequest {
    private String message;
    private String senderUsername;
    private String senderSigningKeyId;
    private String receiverUsername;
    private String receiverEncryptionKeyId;

    public String getMessage()                { return message; }
    public void setMessage(String v)          { this.message = v; }
    public String getSenderUsername()         { return senderUsername; }
    public void setSenderUsername(String v)   { this.senderUsername = v; }
    public String getSenderSigningKeyId()     { return senderSigningKeyId; }
    public void setSenderSigningKeyId(String v){ this.senderSigningKeyId = v; }
    public String getReceiverUsername()       { return receiverUsername; }
    public void setReceiverUsername(String v) { this.receiverUsername = v; }
    public String getReceiverEncryptionKeyId(){ return receiverEncryptionKeyId; }
    public void setReceiverEncryptionKeyId(String v){ this.receiverEncryptionKeyId = v; }
}
