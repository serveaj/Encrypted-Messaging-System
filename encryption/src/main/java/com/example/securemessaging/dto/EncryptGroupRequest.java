package com.example.securemessaging.dto;

import java.util.List;
import java.util.Map;

public class EncryptGroupRequest {
    private String message;
    private String senderUsername;
    private String senderSigningKeyId;
    private String groupId;
    private List<Map<String, String>> members;

    public String getMessage()                       { return message; }
    public void setMessage(String v)                 { this.message = v; }
    public String getSenderUsername()                { return senderUsername; }
    public void setSenderUsername(String v)          { this.senderUsername = v; }
    public String getSenderSigningKeyId()            { return senderSigningKeyId; }
    public void setSenderSigningKeyId(String v)      { this.senderSigningKeyId = v; }
    public String getGroupId()                       { return groupId; }
    public void setGroupId(String v)                 { this.groupId = v; }
    public List<Map<String, String>> getMembers()    { return members; }
    public void setMembers(List<Map<String, String>> v) { this.members = v; }
}
