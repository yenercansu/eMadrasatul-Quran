export type LegalDocType = "privacy-policy" | "terms";

export interface LegalSection {
  heading: string;
  body: string;
}

export interface LegalDocument {
  title: string;
  summary: string;
  lastUpdated: string;
  sections: LegalSection[];
}

const PRIVACY_POLICY: LegalDocument = {
  title: "Privacy Policy",
  summary:
    "Quran Madrasa is built with your privacy in mind. This policy explains what data we collect, how it is used, and how you can control it.",
  lastUpdated: "2026-05-19",
  sections: [
    {
      heading: "Data We Store",
      body:
        "We store the minimum information necessary to provide the app's features. This includes your account identifier (email or federated identity token), your Hifz progress (memorized surahs, ayah ranges, and milestone records), your in-app settings (theme, notification preferences), and timestamps related to streaks and review sessions.\n\nWe do not store payment information, location data, or device contact lists.",
    },
    {
      heading: "Madeenan Backend Processing",
      body:
        "All persistent data is processed and stored by the Madeenan backend service. Your Quran progress and account data are synced through encrypted HTTPS connections. Madeenan acts as the data processor for your account; you retain ownership of your personal data at all times.",
    },
    {
      heading: "Authentication & Account Linking",
      body:
        "You can sign in using Google Sign-In or other supported federated identity providers. Authentication tokens are managed securely and are never stored in plain text. If you link a Quran Foundation account, the OAuth access token for that integration is stored server-side by Madeenan — it is not stored on your device.\n\nYou may unlink third-party accounts or delete your account at any time from the Settings screen.",
    },
    {
      heading: "Analytics & Crash Reporting",
      body:
        "The app may collect anonymized crash reports and usage analytics to improve stability and user experience. This data does not contain personally identifiable information and cannot be used to identify you individually. You may opt out of analytics by contacting us at the support email below.",
    },
    {
      heading: "Notification Permissions",
      body:
        "If you enable Daily Reading Reminders, the app requests notification permission from your device. Notifications are generated locally on your device based on your chosen reminder time. We do not send push notifications from our servers at this time. You can revoke notification permission at any time from your device settings.",
    },
    {
      heading: "Account Deletion",
      body:
        "You may permanently delete your account from Settings → Account → Delete Account. This action removes your account record and all associated Quran progress data from Madeenan's servers. Deletion is irreversible. Any locally cached data is also cleared from your device at the time of deletion.",
    },
    {
      heading: "Contact & Support",
      body:
        "For privacy-related questions, data requests, or support, please contact us at:\n\ncansuyne@gmail.com\n\nWe aim to respond within 5 business days.",
    },
  ],
};

const TERMS: LegalDocument = {
  title: "Terms & Conditions",
  summary:
    "By using Quran Madrasa you agree to these terms. Please read them carefully — they protect both you and the integrity of the app.",
  lastUpdated: "2026-05-19",
  sections: [
    {
      heading: "Purpose of the App",
      body:
        "Quran Madrasa is an educational and spiritual tool designed to support the memorization (Hifz) of the Holy Quran. The app is intended for personal, non-commercial religious and educational use only.",
    },
    {
      heading: "Acceptable Use",
      body:
        "You agree to use the app in a respectful manner consistent with its religious purpose. You must not:\n\n• Attempt to reverse-engineer, decompile, or tamper with the app or its backend services.\n• Use automated tools, bots, or scripts to access the app's content or APIs.\n• Use the app for any unlawful purpose or in any way that could harm other users or the service.",
    },
    {
      heading: "Account Responsibility",
      body:
        "You are responsible for maintaining the security of your account credentials. Do not share your account with others. You are responsible for all activity that occurs under your account. If you believe your account has been compromised, contact us immediately at cansuyne@gmail.com.",
    },
    {
      heading: "Content & Source Attribution",
      body:
        "Quranic text, audio recitations, and translations are served through the Madeenan backend, which sources content from the Quran Foundation and other licensed providers. All Quranic content remains the intellectual and spiritual heritage of the Muslim community. The app does not claim ownership of any Quranic text or recitation.",
    },
    {
      heading: "Limitation of Liability",
      body:
        "Quran Madrasa is provided on an \"as-is\" basis without warranties of any kind. To the fullest extent permitted by law, we are not liable for any indirect, incidental, or consequential damages arising from your use of the app, including loss of data or interruption of service.",
    },
    {
      heading: "Service Availability",
      body:
        "We strive to keep the app available at all times but cannot guarantee uninterrupted access. The service may be temporarily unavailable due to maintenance, technical issues, or circumstances beyond our control. We reserve the right to modify or discontinue features with reasonable notice.",
    },
    {
      heading: "Changes to These Terms",
      body:
        "We may update these Terms & Conditions from time to time. The \"Last updated\" date at the bottom of this page reflects the most recent revision. Continued use of the app after changes are posted constitutes your acceptance of the updated terms.",
    },
  ],
};

export const LEGAL_DOCUMENTS: Record<LegalDocType, LegalDocument> = {
  "privacy-policy": PRIVACY_POLICY,
  terms: TERMS,
};
