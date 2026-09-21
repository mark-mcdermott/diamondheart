import { Footer } from "@/components/blocks/footer";
import { NativeHide } from "@/components/native-hide";

export function PublicFooter() {
  return (
    <NativeHide>
      <Footer siteName="Diamondheart" logoImage="/logo.png" />
    </NativeHide>
  );
}
