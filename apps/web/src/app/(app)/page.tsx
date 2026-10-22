import { AiAssistant } from "@/features/ai";
import { HomeAnnouncementBanner } from "@/features/announcements";
import { HomeScreen } from "@/features/home";

export default function Home() {
  return (
    <>
      <HomeScreen topSlot={<HomeAnnouncementBanner />} />
      <AiAssistant />
    </>
  );
}
