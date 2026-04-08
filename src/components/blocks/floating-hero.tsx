import Image from "next/image";

interface FloatingHeroProps {
  title?: string;
  image?: string;
  logo?: string;
  logoIcon?: string;
  description?: string;
  descriptionWidth?: string;
  inline?: boolean;
  children?: React.ReactNode;
}

export function FloatingHero({
  title = "My App",
  image,
  logo,
  logoIcon,
  description,
  descriptionWidth = "max-w-md",
  inline = false,
  children,
}: FloatingHeroProps) {
  const isLogoImage = logo && (logo.startsWith("/") || logo.startsWith("http"));

  return (
    <section
      className={`flex flex-col items-center justify-center px-4 py-16 text-center ${
        inline ? "" : "min-h-[50vh]"
      }`}
    >
      {image && (
        <Image
          src={image}
          alt=""
          width={120}
          height={120}
          className="mb-6 rounded-xl"
        />
      )}

      <div className="flex items-center gap-3 mb-4">
        {logoIcon && <span className="text-4xl">{logoIcon}</span>}
        {isLogoImage && (
          <Image src={logo} alt="" width={48} height={48} className="rounded" />
        )}
        {logo && !isLogoImage && <span className="text-4xl">{logo}</span>}
        <h1 className="text-5xl font-bold tracking-tight">{title}</h1>
      </div>

      {description && (
        <p className={`text-lg text-muted-foreground ${descriptionWidth} mx-auto`}>
          {description}
        </p>
      )}

      {children && <div className="mt-8 flex gap-4">{children}</div>}
    </section>
  );
}
