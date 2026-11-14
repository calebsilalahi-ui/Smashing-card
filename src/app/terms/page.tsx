import type { Metadata } from "next";
import { BRAND } from "@/lib/config";
import { LegalShell, P, UL, type LegalSectionData } from "@/components/legal/LegalShell";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan / Terms & Conditions · Smashing Burger",
  description:
    "Syarat dan ketentuan program Kartu VIP Loyalty digital Smashing Burger: stempel, hadiah Helena Burger, dan aturan penggunaan.",
};

const mail = BRAND.supportEmail;
const Mail = () => (
  <a className="text-fg underline underline-offset-4" href={`mailto:${mail}`}>
    {mail}
  </a>
);

const sections: LegalSectionData[] = [
  {
    id: "program",
    title: { id: "Tentang Program", en: "About the Programme" },
    body: {
      id: (
        <P>
          Kartu VIP Smashing Burger adalah program loyalitas digital (aplikasi web/PWA) yang
          memungkinkan member mengumpulkan stempel dari pembelian di outlet Smashing Burger dan
          menukarnya dengan hadiah. Dengan masuk dan menggunakan aplikasi, Anda menyetujui
          syarat ini dan{" "}
          <a className="text-fg underline underline-offset-4" href="/privacy">
            Kebijakan Privasi
          </a>
          .
        </P>
      ),
      en: (
        <P>
          The Smashing Burger VIP Card is a digital loyalty programme (web app / PWA) that lets
          members collect stamps from purchases at Smashing Burger outlets and exchange them
          for a reward. By signing in and using the app, you accept these terms and the{" "}
          <a className="text-fg underline underline-offset-4" href="/privacy">
            Privacy Policy
          </a>
          .
        </P>
      ),
    },
  },
  {
    id: "eligibility",
    title: { id: "Keanggotaan dan Akun", en: "Membership and Account" },
    body: {
      id: (
        <UL>
          <li>Masuk menggunakan akun Google. Satu orang satu akun.</li>
          <li>Pengguna di bawah 17 tahun memerlukan persetujuan orang tua atau wali.</li>
          <li>Anda bertanggung jawab atas aktivitas pada akun dan perangkat Anda.</li>
          <li>Setiap member mendapat kode member (SB-XXXX) yang bersifat pribadi.</li>
        </UL>
      ),
      en: (
        <UL>
          <li>Sign in with a Google account. One person, one account.</li>
          <li>Users under 17 need the consent of a parent or guardian.</li>
          <li>You are responsible for activity on your account and device.</li>
          <li>Each member gets a personal member code (SB-XXXX).</li>
        </UL>
      ),
    },
  },
  {
    id: "stamps",
    title: { id: "Cara Mendapatkan Stempel", en: "How to Earn Stamps" },
    body: {
      id: (
        <>
          <UL>
            <li>
              Setiap Rp 50.000 pada Total akhir SATU struk = 1 stempel. Jumlah tidak
              diakumulasi antar struk dan sisa tidak dibawa (Rp 85.000 = 1 stempel).
            </li>
            <li>Minimum Rp 50.000 per struk.</li>
            <li>
              <strong>Maksimal 10 stempel per struk.</strong>
            </li>
            <li>
              Kartu menampung maksimal 10 stempel. Saat kartu penuh (10/10), struk baru tidak dapat
              dipindai sampai Helena Burger gratis ditukarkan; struk tersebut tidak hangus dan dapat
              dipindai setelah penukaran selama masih dalam batas 7 hari. Jika satu struk akan membuat
              kartu melebihi 10 stempel, kartu diisi hingga 10 dan kelebihannya tidak ditambahkan.
            </li>
            <li>Struk harus bertanggal dalam 7 hari terakhir.</li>
            <li>Setiap Nomor Struk hanya dapat diklaim sekali, oleh satu member.</li>
          </UL>
        </>
      ),
      en: (
        <>
          <UL>
            <li>
              Every Rp 50.000 in ONE receipt&apos;s final Total = 1 stamp. Amounts do not
              accumulate across receipts and the remainder does not carry over (Rp 85.000 = 1
              stamp).
            </li>
            <li>Minimum Rp 50.000 per receipt.</li>
            <li>
              <strong>Maximum 10 stamps per receipt.</strong>
            </li>
            <li>
              A card holds a maximum of 10 stamps. When the card is full (10/10), new receipts cannot
              be scanned until the free Helena Burger is redeemed; such a receipt is not forfeited and
              may be scanned after redemption while still within the 7-day window. If a single receipt
              would take the card above 10 stamps, the card is filled to 10 and the excess is not added.
            </li>
            <li>The receipt must be dated within the last 7 days.</li>
            <li>Each Receipt Number can be claimed once only, by one member.</li>
          </UL>
        </>
      ),
    },
  },
  {
    id: "scanning",
    title: { id: "Pemindaian dan Verifikasi Struk", en: "Receipt Scanning and Verification" },
    body: {
      id: (
        <>
          <P>
            Anda memotret struk MokaPOS di dalam aplikasi. Foto dikompresi di perangkat dan
            dianalisis oleh AI vision hanya untuk membaca keaslian struk Smashing Burger,
            Nomor Struk, tanggal, dan Total akhir. Foto struk tidak kami simpan.
          </P>
          <P>
            Struk ditolak jika tingkat keyakinan AI di bawah ambang batas kami, jika tidak
            terbaca, diedit, atau palsu. Hasil ini adalah keputusan otomatis; Anda dapat
            meminta peninjauan manual oleh staf di kasir atau melalui <Mail />.
          </P>
        </>
      ),
      en: (
        <>
          <P>
            You photograph your MokaPOS receipt in the app. The photo is compressed on your
            device and analysed by AI vision solely to read whether it is a genuine Smashing
            Burger receipt, plus the Receipt Number, date, and final Total. We do not store
            the receipt photo.
          </P>
          <P>
            A receipt is rejected if the AI confidence is below our threshold, or if it is
            unreadable, edited, or fake. This is an automated decision; you may request human
            review by staff at the counter or via <Mail />.
          </P>
        </>
      ),
    },
  },
  {
    id: "reward",
    title: { id: "Hadiah: Helena Burger Gratis", en: "Reward: Free Helena Burger" },
    body: {
      id: (
        <UL>
          <li>10 stempel = 1 Helena Burger gratis.</li>
          <li>
            Penukaran dilakukan di kasir: staf memasukkan PIN Staf 4 digit pada ponsel member.
            PIN dirotasi setiap hari.
          </li>
          <li>
            Setelah 5 kali salah memasukkan PIN, penukaran dikunci selama 15 menit.
          </li>
          <li>
            Jika berhasil, 10 stempel dikurangi (kartu kembali ke 0/10) dan tiket
            kasir hijau langsung berlaku selama 3 menit. Tangkapan layar tidak sah.
          </li>
          <li>
            Hadiah tidak memiliki nilai tunai dan tidak dapat dipindahtangankan; berlaku untuk
            makan di tempat atau bawa pulang di outlet Smashing Burger, sesuai ketersediaan
            (kami dapat menawarkan pengganti yang setara).
          </li>
        </UL>
      ),
      en: (
        <UL>
          <li>10 stamps = 1 free Helena Burger.</li>
          <li>
            Redemption happens at the counter: staff enters a 4-digit Staff PIN on the
            member&apos;s phone. The PIN is rotated daily.
          </li>
          <li>After 5 wrong PIN attempts, redemption is locked for 15 minutes.</li>
          <li>
            On success, 10 stamps are deducted (the card returns to 0/10) and a live green
            counter ticket is shown for 3 minutes. Screenshots are not valid.
          </li>
          <li>
            The reward has no cash value and is not transferable; it applies to dine-in or
            takeaway at a Smashing Burger outlet, subject to availability (an equivalent
            substitute may be offered).
          </li>
        </UL>
      ),
    },
  },
  {
    id: "conduct",
    title: { id: "Larangan dan Kecurangan", en: "Prohibited Conduct and Fraud" },
    body: {
      id: (
        <>
          <P>Dilarang: memalsukan atau mengedit struk, mengklaim struk milik orang lain
            atau yang sudah diklaim, memakai banyak akun, mengakali PIN Staf, atau menyerang
            keamanan aplikasi.</P>
          <P>
            Jika kami menemukan kecurangan atau penyalahgunaan, kami berhak membatalkan
            stempel terkait, menolak penukaran, dan menangguhkan atau menutup akun.
          </P>
        </>
      ),
      en: (
        <>
          <P>Not allowed: forging or editing receipts, claiming receipts belonging to others or
            already claimed, using multiple accounts, circumventing the Staff PIN, or
            attacking the app&apos;s security.</P>
          <P>
            If we find fraud or abuse, we may void the related stamps, refuse redemptions, and
            suspend or close the account.
          </P>
        </>
      ),
    },
  },
  {
    id: "data",
    title: { id: "Data Pribadi dan Notifikasi", en: "Personal Data and Notifications" },
    body: {
      id: (
        <P>
          Pemrosesan data pribadi diatur dalam{" "}
          <a className="text-fg underline underline-offset-4" href="/privacy">
            Kebijakan Privasi
          </a>
          , termasuk hak Anda untuk mengunduh data dan menghapus akun dengan sekali ketuk.
          Notifikasi pengingat harian bersifat opsional dan dapat Anda nonaktifkan kapan saja.
          Menghapus akun menghapus stempel dan hadiah yang belum ditukar.
        </P>
      ),
      en: (
        <P>
          Processing of personal data is governed by the{" "}
          <a className="text-fg underline underline-offset-4" href="/privacy">
            Privacy Policy
          </a>
          , including your right to download your data and delete your account in one tap.
          Daily reminder notifications are optional and can be turned off at any time.
          Deleting your account removes your stamps and any unredeemed rewards.
        </P>
      ),
    },
  },
  {
    id: "changes",
    title: { id: "Perubahan Program", en: "Changes to the Programme" },
    body: {
      id: (
        <P>
          Kami dapat mengubah, menjeda, atau mengakhiri program atau syarat ini dengan
          pemberitahuan wajar melalui aplikasi. Stempel yang sah sebelum perubahan tetap
          dihormati selama masa pemberitahuan. Penggunaan lanjutan setelah perubahan berarti
          Anda menerimanya.
        </P>
      ),
      en: (
        <P>
          We may change, pause, or end the programme or these terms with reasonable notice in
          the app. Valid stamps earned before a change are honoured during the notice period.
          Continued use after a change means you accept it.
        </P>
      ),
    },
  },
  {
    id: "liability",
    title: { id: "Batas Tanggung Jawab", en: "Limitation of Liability" },
    body: {
      id: (
        <P>
          Aplikasi disediakan apa adanya dan kami berupaya menjaganya tersedia, namun tidak
          menjamin bebas gangguan. Sejauh diizinkan hukum, tanggung jawab kami terbatas pada
          nilai hadiah yang menjadi hak Anda. Ketentuan ini tidak membatasi hak konsumen dan
          hak subjek data Anda yang dijamin undang-undang.
        </P>
      ),
      en: (
        <P>
          The app is provided as is and we work to keep it available but do not guarantee it is
          free of interruptions. To the extent permitted by law, our liability is limited to
          the value of the reward you are entitled to. This does not limit your statutory
          consumer and data subject rights.
        </P>
      ),
    },
  },
  {
    id: "law",
    title: { id: "Hukum, Sengketa, dan Kontak", en: "Governing Law, Disputes, and Contact" },
    body: {
      id: (
        <>
          <P>
            Syarat ini tunduk pada hukum Republik Indonesia. Sengketa diselesaikan terlebih
            dahulu melalui musyawarah dengan itikad baik; jika tidak tercapai, diselesaikan di
            Pengadilan Negeri Jakarta Selatan. Jika terdapat perbedaan antara versi Bahasa
            Indonesia dan Inggris, versi Bahasa Indonesia yang berlaku (UU No. 24 Tahun 2009).
          </P>
          <P>
            Pertanyaan: <Mail />
          </P>
        </>
      ),
      en: (
        <>
          <P>
            These terms are governed by the laws of the Republic of Indonesia. Disputes are
            first resolved through good-faith deliberation (musyawarah); failing that, before
            the South Jakarta District Court (Pengadilan Negeri Jakarta Selatan). In case of
            conflict between the Bahasa Indonesia and English versions, the Bahasa Indonesia
            version prevails (Law No. 24 of 2009).
          </P>
          <P>
            Questions: <Mail />
          </P>
        </>
      ),
    },
  },
];

export default function TermsPage() {
  return (
    <LegalShell
      title={{ id: "Syarat & Ketentuan", en: "Terms & Conditions" }}
      intro={{
        id: (
          <p>
            Syarat berikut mengatur program Kartu VIP Loyalty digital Smashing Burger. Mohon
            dibaca sebelum mengumpulkan stempel atau menukar hadiah.
          </p>
        ),
        en: (
          <p>
            These terms govern the Smashing Burger digital VIP Loyalty Card programme. Please
            read them before collecting stamps or redeeming a reward.
          </p>
        ),
      }}
      sections={sections}
    />
  );
}
