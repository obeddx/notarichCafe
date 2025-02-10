import HeroAboutUs from "@/components/heroAboutUs";
import HowToReserve from "@/components/heroReserve";
import HeroSection from "@/components/heroSection";
import GallerySlide from "@/components/heroGallery";
import ClientReviews from "@/components/heroReview";


export default function Home() {
  return (
    <div>
    <HeroSection/>
    <HeroAboutUs/>
    <HowToReserve/>
    <GallerySlide/>
    <ClientReviews/>
    
    
    </div>
  );
}
