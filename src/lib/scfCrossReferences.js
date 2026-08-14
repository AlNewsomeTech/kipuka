// Official SCF 2026.2 cross-references for Kipuka's canonical CMMC control IDs.
// Source: SCF Council workbook, secure-controls-framework-scf-2026-2.xlsx.
// SCF content is used unchanged with attribution under CC BY-ND 4.0.
// These are cross-references only. They do not transfer completion or assessment status.

export const SCF_DATASET = Object.freeze({
  framework: 'Secure Controls Framework',
  version: '2026.2',
  source_url: 'https://github.com/securecontrolsframework/securecontrolsframework/blob/main/secure-controls-framework-scf-2026-2.xlsx',
  license: 'CC BY-ND 4.0',
  attribution: 'Secure Controls Framework (SCF) content © SCF Council, LLC.',
});

export const CMMC_SCF_CROSS_REFERENCES = Object.freeze({
  "AC.L2-3.1.10": [
    {
      "scf_id": "IAC-24",
      "scf_title": "Session Lock",
      "scf_domain": "Identification & Authentication"
    },
    {
      "scf_id": "IAC-24.1",
      "scf_title": "Pattern-Hiding Displays",
      "scf_domain": "Identification & Authentication"
    }
  ],
  "AC.L2-3.1.11": [
    {
      "scf_id": "IAC-25",
      "scf_title": "Session Termination",
      "scf_domain": "Identification & Authentication"
    }
  ],
  "AC.L2-3.1.12": [
    {
      "scf_id": "NET-14",
      "scf_title": "Remote Access",
      "scf_domain": "Network Security"
    },
    {
      "scf_id": "NET-14.1",
      "scf_title": "Automated Monitoring & Control",
      "scf_domain": "Network Security"
    },
    {
      "scf_id": "NET-14.5",
      "scf_title": "Work From Anywhere (WFA) - Telecommuting Security",
      "scf_domain": "Network Security"
    }
  ],
  "AC.L2-3.1.13": [
    {
      "scf_id": "NET-14.2",
      "scf_title": "Protection of Confidentiality / Integrity Using Encryption",
      "scf_domain": "Network Security"
    }
  ],
  "AC.L2-3.1.14": [
    {
      "scf_id": "NET-14.3",
      "scf_title": "Managed Access Control Points",
      "scf_domain": "Network Security"
    }
  ],
  "AC.L2-3.1.15": [
    {
      "scf_id": "NET-14.4",
      "scf_title": "Remote Privileged Commands & Sensitive Data Access",
      "scf_domain": "Network Security"
    }
  ],
  "AC.L2-3.1.16": [
    {
      "scf_id": "NET-15",
      "scf_title": "Wireless Networking",
      "scf_domain": "Network Security"
    }
  ],
  "AC.L2-3.1.17": [
    {
      "scf_id": "NET-15.1",
      "scf_title": "Authentication & Encryption",
      "scf_domain": "Network Security"
    }
  ],
  "AC.L2-3.1.18": [
    {
      "scf_id": "MDM-01",
      "scf_title": "Centralized Management Of Mobile Devices",
      "scf_domain": "Mobile Device Management"
    },
    {
      "scf_id": "MDM-02",
      "scf_title": "Access Control For Mobile Devices",
      "scf_domain": "Mobile Device Management"
    },
    {
      "scf_id": "MDM-06",
      "scf_title": "Personally-Owned Mobile Devices",
      "scf_domain": "Mobile Device Management"
    },
    {
      "scf_id": "MDM-07",
      "scf_title": "Organization-Owned Mobile Devices",
      "scf_domain": "Mobile Device Management"
    }
  ],
  "AC.L2-3.1.19": [
    {
      "scf_id": "MDM-03",
      "scf_title": "Full Device & Container-Based Encryption",
      "scf_domain": "Mobile Device Management"
    }
  ],
  "AC.L2-3.1.21": [
    {
      "scf_id": "DCH-13.2",
      "scf_title": "Portable Storage Devices",
      "scf_domain": "Data Classification & Handling"
    }
  ],
  "AC.L2-3.1.3": [
    {
      "scf_id": "DCH-03",
      "scf_title": "Media Access",
      "scf_domain": "Data Classification & Handling"
    },
    {
      "scf_id": "IAC-08",
      "scf_title": "Role-Based Access Control (RBAC)",
      "scf_domain": "Identification & Authentication"
    },
    {
      "scf_id": "NET-04",
      "scf_title": "Data Flow Enforcement – Access Control Lists (ACLs)",
      "scf_domain": "Network Security"
    },
    {
      "scf_id": "NET-18",
      "scf_title": "DNS & Content Filtering",
      "scf_domain": "Network Security"
    }
  ],
  "AC.L2-3.1.4": [
    {
      "scf_id": "HRS-11",
      "scf_title": "Separation of Duties (SoD)",
      "scf_domain": "Human Resources Security"
    }
  ],
  "AC.L2-3.1.5": [
    {
      "scf_id": "IAC-16",
      "scf_title": "Privileged Account Management (PAM)",
      "scf_domain": "Identification & Authentication"
    },
    {
      "scf_id": "IAC-16.1",
      "scf_title": "Privileged Account Inventories",
      "scf_domain": "Identification & Authentication"
    },
    {
      "scf_id": "IAC-21",
      "scf_title": "Least Privilege",
      "scf_domain": "Identification & Authentication"
    },
    {
      "scf_id": "IAC-21.1",
      "scf_title": "Authorize Access to Security Functions",
      "scf_domain": "Identification & Authentication"
    },
    {
      "scf_id": "IAC-21.3",
      "scf_title": "Management Approval For Privileged Accounts",
      "scf_domain": "Identification & Authentication"
    }
  ],
  "AC.L2-3.1.6": [
    {
      "scf_id": "IAC-21.2",
      "scf_title": "Non-Privileged Access for Non-Security Functions",
      "scf_domain": "Identification & Authentication"
    }
  ],
  "AC.L2-3.1.7": [
    {
      "scf_id": "IAC-21.4",
      "scf_title": "Auditing Use of Privileged Functions",
      "scf_domain": "Identification & Authentication"
    },
    {
      "scf_id": "IAC-21.5",
      "scf_title": "Prohibit Non-Privileged Users from Executing Privileged Functions",
      "scf_domain": "Identification & Authentication"
    }
  ],
  "AC.L2-3.1.8": [
    {
      "scf_id": "IAC-22",
      "scf_title": "Account Lockout",
      "scf_domain": "Identification & Authentication"
    }
  ],
  "AC.L2-3.1.9": [
    {
      "scf_id": "SEA-18",
      "scf_title": "System Use Notification (Logon Banner)",
      "scf_domain": "Secure Engineering & Architecture"
    },
    {
      "scf_id": "SEA-18.1",
      "scf_title": "Standardized Microsoft Windows Banner",
      "scf_domain": "Secure Engineering & Architecture"
    },
    {
      "scf_id": "SEA-18.2",
      "scf_title": "Truncated Banner",
      "scf_domain": "Secure Engineering & Architecture"
    }
  ],
  "AT.L2-3.2.1": [
    {
      "scf_id": "HRS-04.2",
      "scf_title": "Formal Indoctrination",
      "scf_domain": "Human Resources Security"
    },
    {
      "scf_id": "SAT-02",
      "scf_title": "Security, Compliance & Resilience Awareness Training",
      "scf_domain": "Security Awareness & Training"
    }
  ],
  "AT.L2-3.2.2": [
    {
      "scf_id": "HRS-04.2",
      "scf_title": "Formal Indoctrination",
      "scf_domain": "Human Resources Security"
    },
    {
      "scf_id": "SAT-03",
      "scf_title": "Role-Based Security, Compliance & Resilience Training",
      "scf_domain": "Security Awareness & Training"
    }
  ],
  "AT.L2-3.2.3": [
    {
      "scf_id": "SAT-03.6",
      "scf_title": "Cyber Threat Environment",
      "scf_domain": "Security Awareness & Training"
    },
    {
      "scf_id": "THR-05",
      "scf_title": "Insider Threat Awareness",
      "scf_domain": "Threat Management"
    }
  ],
  "AU.L2-3.3.1": [
    {
      "scf_id": "MON-02",
      "scf_title": "Centralized Collection of Security Event Logs",
      "scf_domain": "Continuous Monitoring"
    },
    {
      "scf_id": "MON-10",
      "scf_title": "Event Log Retention",
      "scf_domain": "Continuous Monitoring"
    }
  ],
  "AU.L2-3.3.2": [
    {
      "scf_id": "MON-03",
      "scf_title": "Content of Event Logs",
      "scf_domain": "Continuous Monitoring"
    }
  ],
  "AU.L2-3.3.3": [
    {
      "scf_id": "CFG-02",
      "scf_title": "Secure Baseline Configurations",
      "scf_domain": "Configuration Management"
    },
    {
      "scf_id": "CFG-02.1",
      "scf_title": "Reviews & Updates",
      "scf_domain": "Configuration Management"
    },
    {
      "scf_id": "CFG-02.9",
      "scf_title": "Baseline Tailoring",
      "scf_domain": "Configuration Management"
    },
    {
      "scf_id": "MON-01",
      "scf_title": "Continuous Monitoring",
      "scf_domain": "Continuous Monitoring"
    },
    {
      "scf_id": "MON-01.8",
      "scf_title": "Security Event Monitoring",
      "scf_domain": "Continuous Monitoring"
    },
    {
      "scf_id": "MON-01.16",
      "scf_title": "Analyze and Prioritize Monitoring Requirements",
      "scf_domain": "Continuous Monitoring"
    },
    {
      "scf_id": "MON-02",
      "scf_title": "Centralized Collection of Security Event Logs",
      "scf_domain": "Continuous Monitoring"
    }
  ],
  "AU.L2-3.3.4": [
    {
      "scf_id": "MON-05",
      "scf_title": "Response To Event Log Processing Failures",
      "scf_domain": "Continuous Monitoring"
    }
  ],
  "AU.L2-3.3.5": [
    {
      "scf_id": "MON-02",
      "scf_title": "Centralized Collection of Security Event Logs",
      "scf_domain": "Continuous Monitoring"
    },
    {
      "scf_id": "MON-02.1",
      "scf_title": "Correlate Monitoring Information",
      "scf_domain": "Continuous Monitoring"
    }
  ],
  "AU.L2-3.3.6": [
    {
      "scf_id": "MON-02",
      "scf_title": "Centralized Collection of Security Event Logs",
      "scf_domain": "Continuous Monitoring"
    },
    {
      "scf_id": "MON-06",
      "scf_title": "Monitoring Reporting",
      "scf_domain": "Continuous Monitoring"
    }
  ],
  "AU.L2-3.3.7": [
    {
      "scf_id": "MON-07.1",
      "scf_title": "Synchronization With Authoritative Time Source",
      "scf_domain": "Continuous Monitoring"
    },
    {
      "scf_id": "SEA-20",
      "scf_title": "Clock Synchronization",
      "scf_domain": "Secure Engineering & Architecture"
    }
  ],
  "AU.L2-3.3.8": [
    {
      "scf_id": "MON-02",
      "scf_title": "Centralized Collection of Security Event Logs",
      "scf_domain": "Continuous Monitoring"
    },
    {
      "scf_id": "MON-03.1",
      "scf_title": "Sensitive Event Log Information",
      "scf_domain": "Continuous Monitoring"
    },
    {
      "scf_id": "MON-08",
      "scf_title": "Protection of Event Logs",
      "scf_domain": "Continuous Monitoring"
    }
  ],
  "AU.L2-3.3.9": [
    {
      "scf_id": "MON-02",
      "scf_title": "Centralized Collection of Security Event Logs",
      "scf_domain": "Continuous Monitoring"
    },
    {
      "scf_id": "MON-08.2",
      "scf_title": "Access by Subset of Privileged Users",
      "scf_domain": "Continuous Monitoring"
    }
  ],
  "CA.L2-3.12.1": [
    {
      "scf_id": "CPL-02",
      "scf_title": "Security, Compliance & Resilience Controls Oversight",
      "scf_domain": "Compliance"
    },
    {
      "scf_id": "CPL-02.1",
      "scf_title": "Internal Audit Function",
      "scf_domain": "Compliance"
    },
    {
      "scf_id": "CPL-03",
      "scf_title": "Control Conformity Monitoring",
      "scf_domain": "Compliance"
    },
    {
      "scf_id": "IAO-02",
      "scf_title": "Assessments",
      "scf_domain": "Information Assurance"
    }
  ],
  "CA.L2-3.12.2": [
    {
      "scf_id": "IAO-05",
      "scf_title": "Capabilities Deficiency Tracking",
      "scf_domain": "Information Assurance"
    }
  ],
  "CA.L2-3.12.3": [
    {
      "scf_id": "CPL-02",
      "scf_title": "Security, Compliance & Resilience Controls Oversight",
      "scf_domain": "Compliance"
    },
    {
      "scf_id": "THR-01",
      "scf_title": "Threat Intelligence Program",
      "scf_domain": "Threat Management"
    },
    {
      "scf_id": "THR-03",
      "scf_title": "Threat Intelligence Feeds",
      "scf_domain": "Threat Management"
    }
  ],
  "CA.L2-3.12.4": [
    {
      "scf_id": "IAO-03",
      "scf_title": "Applied Security, Compliance and Resilience Controls Documentation",
      "scf_domain": "Information Assurance"
    },
    {
      "scf_id": "IAO-03.2",
      "scf_title": "Adequate Security for Sensitive / Regulated Data In Support of Contracts",
      "scf_domain": "Information Assurance"
    }
  ],
  "CM.L2-3.4.1": [
    {
      "scf_id": "AST-01",
      "scf_title": "Asset Governance",
      "scf_domain": "Asset Management"
    },
    {
      "scf_id": "AST-02",
      "scf_title": "Asset Inventories",
      "scf_domain": "Asset Management"
    },
    {
      "scf_id": "CFG-02",
      "scf_title": "Secure Baseline Configurations",
      "scf_domain": "Configuration Management"
    }
  ],
  "CM.L2-3.4.2": [
    {
      "scf_id": "CFG-02",
      "scf_title": "Secure Baseline Configurations",
      "scf_domain": "Configuration Management"
    }
  ],
  "CM.L2-3.4.3": [
    {
      "scf_id": "CHG-01",
      "scf_title": "Change Management Program",
      "scf_domain": "Change Management"
    },
    {
      "scf_id": "CHG-02",
      "scf_title": "Configuration Change Control",
      "scf_domain": "Change Management"
    }
  ],
  "CM.L2-3.4.4": [
    {
      "scf_id": "CHG-03",
      "scf_title": "Security Impact Analysis for Changes",
      "scf_domain": "Change Management"
    }
  ],
  "CM.L2-3.4.5": [
    {
      "scf_id": "CHG-04",
      "scf_title": "Access Restriction For Change",
      "scf_domain": "Change Management"
    },
    {
      "scf_id": "TDA-08",
      "scf_title": "Separation of Development, Testing and Operational Environments",
      "scf_domain": "Technology Development & Acquisition"
    }
  ],
  "CM.L2-3.4.6": [
    {
      "scf_id": "CFG-03",
      "scf_title": "Least Functionality",
      "scf_domain": "Configuration Management"
    }
  ],
  "CM.L2-3.4.7": [
    {
      "scf_id": "CFG-03.1",
      "scf_title": "Periodic Review",
      "scf_domain": "Configuration Management"
    },
    {
      "scf_id": "CFG-03.2",
      "scf_title": "Prevent Unauthorized Software Execution",
      "scf_domain": "Configuration Management"
    }
  ],
  "CM.L2-3.4.8": [
    {
      "scf_id": "CFG-03.3",
      "scf_title": "Explicitly Allow / Deny Applications",
      "scf_domain": "Configuration Management"
    }
  ],
  "CM.L2-3.4.9": [
    {
      "scf_id": "CFG-05",
      "scf_title": "User-Installed Software",
      "scf_domain": "Configuration Management"
    },
    {
      "scf_id": "END-03",
      "scf_title": "Prohibit Installation Without Privileged Status",
      "scf_domain": "Endpoint Security"
    }
  ],
  "IA.L2-3.5.10": [
    {
      "scf_id": "IAC-10.5",
      "scf_title": "Protection of Authenticators",
      "scf_domain": "Identification & Authentication"
    }
  ],
  "IA.L2-3.5.11": [
    {
      "scf_id": "IAC-11",
      "scf_title": "Authenticator Feedback",
      "scf_domain": "Identification & Authentication"
    }
  ],
  "IA.L2-3.5.3": [
    {
      "scf_id": "IAC-06",
      "scf_title": "Multi-Factor Authentication (MFA)",
      "scf_domain": "Identification & Authentication"
    },
    {
      "scf_id": "IAC-06.1",
      "scf_title": "Network Access to Privileged Accounts",
      "scf_domain": "Identification & Authentication"
    },
    {
      "scf_id": "IAC-06.2",
      "scf_title": "Network Access to Non-Privileged Accounts",
      "scf_domain": "Identification & Authentication"
    },
    {
      "scf_id": "IAC-06.3",
      "scf_title": "Local Access to Privileged Accounts",
      "scf_domain": "Identification & Authentication"
    }
  ],
  "IA.L2-3.5.4": [
    {
      "scf_id": "IAC-02.2",
      "scf_title": "Replay-Resistant Authentication",
      "scf_domain": "Identification & Authentication"
    }
  ],
  "IA.L2-3.5.5": [
    {
      "scf_id": "IAC-09",
      "scf_title": "Identifier Management (User Names)",
      "scf_domain": "Identification & Authentication"
    }
  ],
  "IA.L2-3.5.6": [
    {
      "scf_id": "IAC-15.3",
      "scf_title": "Disable Inactive Accounts",
      "scf_domain": "Identification & Authentication"
    }
  ],
  "IA.L2-3.5.7": [
    {
      "scf_id": "IAC-10.1",
      "scf_title": "Password-Based Authentication",
      "scf_domain": "Identification & Authentication"
    }
  ],
  "IA.L2-3.5.8": [
    {
      "scf_id": "IAC-10",
      "scf_title": "Authenticator Management",
      "scf_domain": "Identification & Authentication"
    }
  ],
  "IA.L2-3.5.9": [
    {
      "scf_id": "IAC-10",
      "scf_title": "Authenticator Management",
      "scf_domain": "Identification & Authentication"
    }
  ],
  "IR.L2-3.6.1": [
    {
      "scf_id": "IRO-02",
      "scf_title": "Incident Handling",
      "scf_domain": "Incident Response"
    },
    {
      "scf_id": "IRO-05",
      "scf_title": "Incident Response Training",
      "scf_domain": "Incident Response"
    }
  ],
  "IR.L2-3.6.2": [
    {
      "scf_id": "IRO-02",
      "scf_title": "Incident Handling",
      "scf_domain": "Incident Response"
    }
  ],
  "IR.L2-3.6.3": [
    {
      "scf_id": "IRO-06",
      "scf_title": "Incident Response Testing",
      "scf_domain": "Incident Response"
    }
  ],
  "MA.L2-3.7.1": [
    {
      "scf_id": "MNT-02",
      "scf_title": "Controlled Maintenance",
      "scf_domain": "Maintenance"
    }
  ],
  "MA.L2-3.7.2": [
    {
      "scf_id": "MNT-04",
      "scf_title": "Maintenance Tools",
      "scf_domain": "Maintenance"
    }
  ],
  "MA.L2-3.7.3": [
    {
      "scf_id": "DCH-09",
      "scf_title": "System Media Sanitization",
      "scf_domain": "Data Classification & Handling"
    }
  ],
  "MA.L2-3.7.4": [
    {
      "scf_id": "MNT-04.2",
      "scf_title": "Inspect Media",
      "scf_domain": "Maintenance"
    }
  ],
  "MA.L2-3.7.5": [
    {
      "scf_id": "IAC-06",
      "scf_title": "Multi-Factor Authentication (MFA)",
      "scf_domain": "Identification & Authentication"
    },
    {
      "scf_id": "MNT-05",
      "scf_title": "Remote Maintenance",
      "scf_domain": "Maintenance"
    },
    {
      "scf_id": "MNT-05.4",
      "scf_title": "Remote Maintenance Disconnect Verification",
      "scf_domain": "Maintenance"
    }
  ],
  "MA.L2-3.7.6": [
    {
      "scf_id": "MNT-06",
      "scf_title": "Authorized Maintenance Personnel",
      "scf_domain": "Maintenance"
    },
    {
      "scf_id": "MNT-06.1",
      "scf_title": "Maintenance Personnel Without Appropriate Access",
      "scf_domain": "Maintenance"
    },
    {
      "scf_id": "MNT-06.2",
      "scf_title": "Non-System Related Maintenance",
      "scf_domain": "Maintenance"
    }
  ],
  "MP.L2-3.8.1": [
    {
      "scf_id": "DCH-01",
      "scf_title": "Data Protection",
      "scf_domain": "Data Classification & Handling"
    },
    {
      "scf_id": "DCH-06",
      "scf_title": "Media Storage",
      "scf_domain": "Data Classification & Handling"
    }
  ],
  "MP.L2-3.8.2": [
    {
      "scf_id": "DCH-03",
      "scf_title": "Media Access",
      "scf_domain": "Data Classification & Handling"
    }
  ],
  "MP.L2-3.8.4": [
    {
      "scf_id": "DCH-04",
      "scf_title": "Media Marking",
      "scf_domain": "Data Classification & Handling"
    }
  ],
  "MP.L2-3.8.5": [
    {
      "scf_id": "DCH-07",
      "scf_title": "Media Transportation",
      "scf_domain": "Data Classification & Handling"
    }
  ],
  "MP.L2-3.8.6": [
    {
      "scf_id": "CRY-01.1",
      "scf_title": "Alternate Physical Protection",
      "scf_domain": "Cryptographic Protections"
    },
    {
      "scf_id": "CRY-05",
      "scf_title": "Encrypting Data At Rest",
      "scf_domain": "Cryptographic Protections"
    }
  ],
  "MP.L2-3.8.7": [
    {
      "scf_id": "DCH-10",
      "scf_title": "Media Use",
      "scf_domain": "Data Classification & Handling"
    }
  ],
  "MP.L2-3.8.8": [
    {
      "scf_id": "DCH-10.2",
      "scf_title": "Prohibit Use Without Owner",
      "scf_domain": "Data Classification & Handling"
    }
  ],
  "MP.L2-3.8.9": [
    {
      "scf_id": "BCD-11",
      "scf_title": "Data Backups",
      "scf_domain": "Business Continuity & Disaster Recovery"
    },
    {
      "scf_id": "BCD-11.4",
      "scf_title": "Cryptographic Protection",
      "scf_domain": "Business Continuity & Disaster Recovery"
    }
  ],
  "PE.L2-3.10.2": [
    {
      "scf_id": "PES-01",
      "scf_title": "Physical & Environmental Protections",
      "scf_domain": "Physical & Environmental Security"
    },
    {
      "scf_id": "PES-05",
      "scf_title": "Monitoring Physical Access",
      "scf_domain": "Physical & Environmental Security"
    },
    {
      "scf_id": "PES-05.1",
      "scf_title": "Intrusion Alarms / Surveillance Equipment",
      "scf_domain": "Physical & Environmental Security"
    },
    {
      "scf_id": "PES-05.2",
      "scf_title": "Monitoring Physical Access To Critical Systems",
      "scf_domain": "Physical & Environmental Security"
    }
  ],
  "PE.L2-3.10.6": [
    {
      "scf_id": "DCH-01.2",
      "scf_title": "Sensitive / Regulated Data Protection",
      "scf_domain": "Data Classification & Handling"
    },
    {
      "scf_id": "NET-14.5",
      "scf_title": "Work From Anywhere (WFA) - Telecommuting Security",
      "scf_domain": "Network Security"
    },
    {
      "scf_id": "PES-11",
      "scf_title": "Alternate Work Site",
      "scf_domain": "Physical & Environmental Security"
    }
  ],
  "PS.L2-3.9.1": [
    {
      "scf_id": "HRS-04",
      "scf_title": "Personnel Screening",
      "scf_domain": "Human Resources Security"
    },
    {
      "scf_id": "HRS-04.1",
      "scf_title": "Roles With Special Protection Measures",
      "scf_domain": "Human Resources Security"
    }
  ],
  "PS.L2-3.9.2": [
    {
      "scf_id": "HRS-01.1",
      "scf_title": "Onboarding, Transferring & Offboarding Personnel",
      "scf_domain": "Human Resources Security"
    },
    {
      "scf_id": "HRS-08",
      "scf_title": "Personnel Transfer",
      "scf_domain": "Human Resources Security"
    },
    {
      "scf_id": "HRS-09",
      "scf_title": "Personnel Termination",
      "scf_domain": "Human Resources Security"
    }
  ],
  "RA.L2-3.11.1": [
    {
      "scf_id": "RSK-04",
      "scf_title": "Risk Assessment",
      "scf_domain": "Risk Management"
    }
  ],
  "RA.L2-3.11.2": [
    {
      "scf_id": "VPM-06",
      "scf_title": "Vulnerability Scanning",
      "scf_domain": "Vulnerability & Patch Management"
    },
    {
      "scf_id": "VPM-06.3",
      "scf_title": "Privileged Access",
      "scf_domain": "Vulnerability & Patch Management"
    }
  ],
  "RA.L2-3.11.3": [
    {
      "scf_id": "RSK-06",
      "scf_title": "Risk Remediation",
      "scf_domain": "Risk Management"
    },
    {
      "scf_id": "VPM-04",
      "scf_title": "Continuous Vulnerability Remediation Activities",
      "scf_domain": "Vulnerability & Patch Management"
    },
    {
      "scf_id": "VPM-05",
      "scf_title": "Software & Firmware Patching",
      "scf_domain": "Vulnerability & Patch Management"
    }
  ],
  "SC.L2-3.13.10": [
    {
      "scf_id": "CRY-08",
      "scf_title": "Public Key Infrastructure (PKI)",
      "scf_domain": "Cryptographic Protections"
    },
    {
      "scf_id": "CRY-09",
      "scf_title": "Cryptographic Key Management",
      "scf_domain": "Cryptographic Protections"
    }
  ],
  "SC.L2-3.13.11": [
    {
      "scf_id": "CRY-01",
      "scf_title": "Use of Cryptographic Controls",
      "scf_domain": "Cryptographic Protections"
    }
  ],
  "SC.L2-3.13.12": [
    {
      "scf_id": "END-14",
      "scf_title": "Collaborative Computing Devices",
      "scf_domain": "Endpoint Security"
    }
  ],
  "SC.L2-3.13.13": [
    {
      "scf_id": "END-10",
      "scf_title": "Mobile Code",
      "scf_domain": "Endpoint Security"
    }
  ],
  "SC.L2-3.13.14": [
    {
      "scf_id": "NET-13",
      "scf_title": "Electronic Messaging",
      "scf_domain": "Network Security"
    }
  ],
  "SC.L2-3.13.15": [
    {
      "scf_id": "NET-09",
      "scf_title": "Session Integrity",
      "scf_domain": "Network Security"
    }
  ],
  "SC.L2-3.13.16": [
    {
      "scf_id": "CRY-05",
      "scf_title": "Encrypting Data At Rest",
      "scf_domain": "Cryptographic Protections"
    },
    {
      "scf_id": "END-02",
      "scf_title": "Endpoint Protection Measures",
      "scf_domain": "Endpoint Security"
    }
  ],
  "SC.L2-3.13.2": [
    {
      "scf_id": "CLD-03",
      "scf_title": "Cloud Infrastructure Security Subnet",
      "scf_domain": "Cloud Security"
    },
    {
      "scf_id": "SEA-01",
      "scf_title": "Secure Engineering Principles",
      "scf_domain": "Secure Engineering & Architecture"
    },
    {
      "scf_id": "SEA-03",
      "scf_title": "Defense-In-Depth (DiD) Architecture",
      "scf_domain": "Secure Engineering & Architecture"
    }
  ],
  "SC.L2-3.13.3": [
    {
      "scf_id": "SEA-03.2",
      "scf_title": "Application Partitioning",
      "scf_domain": "Secure Engineering & Architecture"
    }
  ],
  "SC.L2-3.13.4": [
    {
      "scf_id": "SEA-05",
      "scf_title": "Information In Shared Resources",
      "scf_domain": "Secure Engineering & Architecture"
    }
  ],
  "SC.L2-3.13.6": [
    {
      "scf_id": "NET-04.1",
      "scf_title": "Deny Traffic by Default & Allow Traffic by Exception",
      "scf_domain": "Network Security"
    }
  ],
  "SC.L2-3.13.7": [
    {
      "scf_id": "CFG-03.4",
      "scf_title": "Split Tunneling",
      "scf_domain": "Configuration Management"
    }
  ],
  "SC.L2-3.13.8": [
    {
      "scf_id": "CRY-01.1",
      "scf_title": "Alternate Physical Protection",
      "scf_domain": "Cryptographic Protections"
    },
    {
      "scf_id": "CRY-03",
      "scf_title": "Transmission Confidentiality",
      "scf_domain": "Cryptographic Protections"
    }
  ],
  "SC.L2-3.13.9": [
    {
      "scf_id": "NET-07",
      "scf_title": "Network Connection Termination",
      "scf_domain": "Network Security"
    }
  ],
  "SI.L2-3.14.3": [
    {
      "scf_id": "MON-01.8",
      "scf_title": "Security Event Monitoring",
      "scf_domain": "Continuous Monitoring"
    },
    {
      "scf_id": "THR-01",
      "scf_title": "Threat Intelligence Program",
      "scf_domain": "Threat Management"
    },
    {
      "scf_id": "THR-03",
      "scf_title": "Threat Intelligence Feeds",
      "scf_domain": "Threat Management"
    }
  ],
  "SI.L2-3.14.6": [
    {
      "scf_id": "MON-01",
      "scf_title": "Continuous Monitoring",
      "scf_domain": "Continuous Monitoring"
    },
    {
      "scf_id": "MON-01.3",
      "scf_title": "Inbound & Outbound Communications Traffic",
      "scf_domain": "Continuous Monitoring"
    },
    {
      "scf_id": "NET-08",
      "scf_title": "Network Intrusion Detection / Prevention Systems (NIDS / NIPS)",
      "scf_domain": "Network Security"
    }
  ],
  "SI.L2-3.14.7": [
    {
      "scf_id": "MON-02.1",
      "scf_title": "Correlate Monitoring Information",
      "scf_domain": "Continuous Monitoring"
    },
    {
      "scf_id": "MON-11.3",
      "scf_title": "Monitoring for Indicators of Compromise (IOC)",
      "scf_domain": "Continuous Monitoring"
    },
    {
      "scf_id": "MON-16",
      "scf_title": "Anomalous Behavior",
      "scf_domain": "Continuous Monitoring"
    },
    {
      "scf_id": "IRO-03",
      "scf_title": "Indicators of Compromise (IOC)",
      "scf_domain": "Incident Response"
    }
  ],
  "AC.L1-3.1.1": [
    {
      "scf_id": "IAC-01",
      "scf_title": "Identity & Access Management (IAM)",
      "scf_domain": "Identification & Authentication"
    },
    {
      "scf_id": "IAC-02",
      "scf_title": "Identification & Authentication for Organizational Users",
      "scf_domain": "Identification & Authentication"
    },
    {
      "scf_id": "IAC-08",
      "scf_title": "Role-Based Access Control (RBAC)",
      "scf_domain": "Identification & Authentication"
    },
    {
      "scf_id": "IAC-15.1",
      "scf_title": "Automated System Account Management (Directory Services)",
      "scf_domain": "Identification & Authentication"
    },
    {
      "scf_id": "IAC-20",
      "scf_title": "Access Enforcement",
      "scf_domain": "Identification & Authentication"
    },
    {
      "scf_id": "TPM-01",
      "scf_title": "Third-Party Management",
      "scf_domain": "Third-Party Management"
    },
    {
      "scf_id": "TPM-05",
      "scf_title": "Third-Party Contract Requirements",
      "scf_domain": "Third-Party Management"
    },
    {
      "scf_id": "TPM-05.2",
      "scf_title": "Contract Flow-Down Requirements",
      "scf_domain": "Third-Party Management"
    }
  ],
  "AC.L1-3.1.2": [
    {
      "scf_id": "IAC-08",
      "scf_title": "Role-Based Access Control (RBAC)",
      "scf_domain": "Identification & Authentication"
    },
    {
      "scf_id": "IAC-15",
      "scf_title": "Account Management",
      "scf_domain": "Identification & Authentication"
    }
  ],
  "AC.L1-3.1.20": [
    {
      "scf_id": "DCH-13",
      "scf_title": "Use of External Technology Assets, Applications and/or Services (TAAS)",
      "scf_domain": "Data Classification & Handling"
    },
    {
      "scf_id": "DCH-13.1",
      "scf_title": "Limits of Authorized Use",
      "scf_domain": "Data Classification & Handling"
    },
    {
      "scf_id": "DCH-17",
      "scf_title": "Ad-Hoc Transfers",
      "scf_domain": "Data Classification & Handling"
    }
  ],
  "AC.L1-3.1.22": [
    {
      "scf_id": "CLD-01",
      "scf_title": "Cloud Services",
      "scf_domain": "Cloud Security"
    },
    {
      "scf_id": "CLD-02",
      "scf_title": "Cloud Security Architecture",
      "scf_domain": "Cloud Security"
    },
    {
      "scf_id": "CLD-06",
      "scf_title": "Multi-Tenant Environments",
      "scf_domain": "Cloud Security"
    },
    {
      "scf_id": "CLD-10",
      "scf_title": "Sensitive Data In Public Cloud Providers",
      "scf_domain": "Cloud Security"
    },
    {
      "scf_id": "DCH-15",
      "scf_title": "Publicly Accessible Content",
      "scf_domain": "Data Classification & Handling"
    },
    {
      "scf_id": "HRS-01",
      "scf_title": "Human Resources Security Management",
      "scf_domain": "Human Resources Security"
    },
    {
      "scf_id": "HRS-05",
      "scf_title": "Terms of Employment",
      "scf_domain": "Human Resources Security"
    },
    {
      "scf_id": "HRS-05.1",
      "scf_title": "Rules of Behavior",
      "scf_domain": "Human Resources Security"
    },
    {
      "scf_id": "HRS-05.2",
      "scf_title": "Social Media & Social Networking Restrictions",
      "scf_domain": "Human Resources Security"
    },
    {
      "scf_id": "WEB-01",
      "scf_title": "Web Security",
      "scf_domain": "Web Security"
    },
    {
      "scf_id": "WEB-02",
      "scf_title": "Use of Demilitarized Zones (DMZ)",
      "scf_domain": "Web Security"
    },
    {
      "scf_id": "WEB-04",
      "scf_title": "Client-Facing Web Services",
      "scf_domain": "Web Security"
    }
  ],
  "IA.L1-3.5.1": [
    {
      "scf_id": "IAC-02",
      "scf_title": "Identification & Authentication for Organizational Users",
      "scf_domain": "Identification & Authentication"
    },
    {
      "scf_id": "IAC-04",
      "scf_title": "Identification & Authentication for Devices",
      "scf_domain": "Identification & Authentication"
    },
    {
      "scf_id": "IAC-15.1",
      "scf_title": "Automated System Account Management (Directory Services)",
      "scf_domain": "Identification & Authentication"
    }
  ],
  "IA.L1-3.5.2": [
    {
      "scf_id": "IAC-02",
      "scf_title": "Identification & Authentication for Organizational Users",
      "scf_domain": "Identification & Authentication"
    },
    {
      "scf_id": "IAC-04",
      "scf_title": "Identification & Authentication for Devices",
      "scf_domain": "Identification & Authentication"
    },
    {
      "scf_id": "IAC-15.1",
      "scf_title": "Automated System Account Management (Directory Services)",
      "scf_domain": "Identification & Authentication"
    }
  ],
  "MP.L1-3.8.3": [
    {
      "scf_id": "AST-01",
      "scf_title": "Asset Governance",
      "scf_domain": "Asset Management"
    },
    {
      "scf_id": "AST-09",
      "scf_title": "Secure Disposal, Destruction or Re-Use of Equipment",
      "scf_domain": "Asset Management"
    },
    {
      "scf_id": "DCH-01",
      "scf_title": "Data Protection",
      "scf_domain": "Data Classification & Handling"
    },
    {
      "scf_id": "DCH-08",
      "scf_title": "Physical Media Disposal",
      "scf_domain": "Data Classification & Handling"
    },
    {
      "scf_id": "DCH-09",
      "scf_title": "System Media Sanitization",
      "scf_domain": "Data Classification & Handling"
    }
  ],
  "PE.L1-3.10.1": [
    {
      "scf_id": "PES-02",
      "scf_title": "Physical Access Authorizations",
      "scf_domain": "Physical & Environmental Security"
    },
    {
      "scf_id": "PES-02.1",
      "scf_title": "Role-Based Physical Access",
      "scf_domain": "Physical & Environmental Security"
    },
    {
      "scf_id": "PES-03.4",
      "scf_title": "Access To Critical Systems",
      "scf_domain": "Physical & Environmental Security"
    },
    {
      "scf_id": "PES-12",
      "scf_title": "Equipment Siting & Protection",
      "scf_domain": "Physical & Environmental Security"
    },
    {
      "scf_id": "PES-12.1",
      "scf_title": "Transmission Medium Security",
      "scf_domain": "Physical & Environmental Security"
    },
    {
      "scf_id": "PES-12.2",
      "scf_title": "Access Control for Output Devices",
      "scf_domain": "Physical & Environmental Security"
    }
  ],
  "PE.L1-3.10.3": [
    {
      "scf_id": "PES-03",
      "scf_title": "Physical Access Control",
      "scf_domain": "Physical & Environmental Security"
    },
    {
      "scf_id": "PES-06",
      "scf_title": "Visitor Control",
      "scf_domain": "Physical & Environmental Security"
    },
    {
      "scf_id": "PES-06.1",
      "scf_title": "Distinguish Visitors from On-Site Personnel",
      "scf_domain": "Physical & Environmental Security"
    },
    {
      "scf_id": "PES-06.3",
      "scf_title": "Restrict Unescorted Access",
      "scf_domain": "Physical & Environmental Security"
    }
  ],
  "PE.L1-3.10.4": [
    {
      "scf_id": "PES-03.3",
      "scf_title": "Physical Access Logs",
      "scf_domain": "Physical & Environmental Security"
    }
  ],
  "PE.L1-3.10.5": [
    {
      "scf_id": "PES-03",
      "scf_title": "Physical Access Control",
      "scf_domain": "Physical & Environmental Security"
    },
    {
      "scf_id": "PES-04",
      "scf_title": "Physical Security of Offices, Rooms & Facilities",
      "scf_domain": "Physical & Environmental Security"
    }
  ],
  "SC.L1-3.13.1": [
    {
      "scf_id": "NET-01",
      "scf_title": "Network Security Controls (NSC)",
      "scf_domain": "Network Security"
    },
    {
      "scf_id": "NET-02.2",
      "scf_title": "Guest Networks",
      "scf_domain": "Network Security"
    },
    {
      "scf_id": "NET-03",
      "scf_title": "Boundary Protection",
      "scf_domain": "Network Security"
    }
  ],
  "SC.L1-3.13.5": [
    {
      "scf_id": "NET-06",
      "scf_title": "Network Segmentation (macrosegmentation)",
      "scf_domain": "Network Security"
    }
  ],
  "SI.L1-3.14.1": [
    {
      "scf_id": "VPM-01",
      "scf_title": "Vulnerability & Patch Management Program (VPMP)",
      "scf_domain": "Vulnerability & Patch Management"
    },
    {
      "scf_id": "VPM-02",
      "scf_title": "Vulnerability Remediation Process",
      "scf_domain": "Vulnerability & Patch Management"
    },
    {
      "scf_id": "VPM-05",
      "scf_title": "Software & Firmware Patching",
      "scf_domain": "Vulnerability & Patch Management"
    }
  ],
  "SI.L1-3.14.2": [
    {
      "scf_id": "END-01",
      "scf_title": "Endpoint Device Management (EDM)",
      "scf_domain": "Endpoint Security"
    },
    {
      "scf_id": "END-04",
      "scf_title": "Malicious Code Protection (Anti-Malware)",
      "scf_domain": "Endpoint Security"
    }
  ],
  "SI.L1-3.14.4": [
    {
      "scf_id": "END-04.1",
      "scf_title": "Automatic Antimalware Signature Updates",
      "scf_domain": "Endpoint Security"
    }
  ],
  "SI.L1-3.14.5": [
    {
      "scf_id": "END-04.7",
      "scf_title": "Always On Protection",
      "scf_domain": "Endpoint Security"
    }
  ]
});

export function scfReferencesFor(controlId) {
  return CMMC_SCF_CROSS_REFERENCES[controlId] || [];
}

export function scfReferenceCount(controlIds) {
  const ids = new Set();
  for (const controlId of controlIds || []) {
    for (const reference of scfReferencesFor(controlId)) ids.add(reference.scf_id);
  }
  return ids.size;
}
