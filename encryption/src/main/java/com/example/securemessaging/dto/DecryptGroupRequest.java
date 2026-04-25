package com.example.securemessaging.dto;

public class DecryptGroupRequest {
    private String senderUsername;
    private String senderSigningKeyId;
    private String groupId;
    private String receiverUsername;
    private String receiverEncryptionKeyId;
    private String encryptedPayload;
    private String encryptedSessionKey;
    private String iv;
    private String signature;

    public String getSenderUsername()          { return senderUsername; }
    public void setSenderUsername(String v)    { this.senderUsername = v; }
    public String getSenderSigningKeyId()      { return senderSigningKeyId; }
    public void setSenderSigningKeyId(String v){ this.senderSigningKeyId = v; }
    public String getGroupId()                 { return groupId; }
    public void setGroupId(String v)           { this.groupId = v; }
    public String getReceiverUsername()        { return receiverUsername; }
    public void setReceiverUsername(String v)  { this.receiverUsername = v; }
    public String getReceiverEncryptionKeyId() { return receiverEncryptionKeyId; }
    public void setReceiverEncryptionKeyId(String v){ this.receiverEncryptionKeyId = v; }
    public String getEncryptedPayload()        { return encryptedPayload; }
    public void setEncryptedPayload(String v)  { this.encryptedPayload = v; }
    public String getEncryptedSessionKey()     { return encryptedSessionKey; }
    public void setEncryptedSessionKey(String v){ this.encryptedSessionKey = v; }
    public String getIv()                      { return iv; }
    public void setIv(String v)                { this.iv = v; }
    public String getSignature()               { return signature; }
    public void setSignature(String v)         { this.signature = v; }
}
