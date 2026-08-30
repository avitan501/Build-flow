"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, Pause, Play, Volume2 } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { approvedStoryVideos, type AvantiaStoryVideo } from "@/lib/avantia-media-library";

import styles from "./concierge-video-library.module.css";

const stories = Object.fromEntries(approvedStoryVideos.map((story) => [story.id, story])) as Record<string, AvantiaStoryVideo>;

function StoryVideo({
  story,
  featured = false,
}: {
  story: AvantiaStoryVideo;
  featured?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.35) {
          video.pause();
          setPlaying(false);
        }
      },
      { threshold: [0, 0.35, 0.7] },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  function play() {
    document.querySelectorAll("video").forEach((video) => {
      if (video !== videoRef.current) video.pause();
    });
    void videoRef.current?.play();
  }

  return (
    <figure
      className={`${styles.videoFrame} ${featured ? styles.videoFeatured : ""}`}
    >
      <div className={styles.videoStage}>
        <video
          ref={videoRef}
          className={styles.video}
          playsInline
          muted
          preload={featured ? "metadata" : "none"}
          poster={story.poster}
          controls
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          aria-label={story.title}
        >
          <source src={story.src} type="video/mp4" />
          <track
            src={story.captions}
            kind="captions"
            srcLang="en"
            label="English"
            default
          />
        </video>
        <button
          type="button"
          onClick={() => (playing ? videoRef.current?.pause() : play())}
          className={styles.playButton}
          aria-label={playing ? `Pause ${story.title}` : `Play ${story.title}`}
        >
          {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
        </button>
      </div>
      <figcaption className={styles.videoCaption}>
        <span>{story.label}</span>
        <strong>{story.title}</strong>
        <details>
          <summary>Read transcript</summary>
          <p>{story.transcript}</p>
        </details>
      </figcaption>
    </figure>
  );
}

function SplitSection({
  eyebrow,
  title,
  body,
  image,
  children,
  reverse = false,
  id,
}: {
  eyebrow: string;
  title: string;
  body: string;
  image?: string;
  children?: ReactNode;
  reverse?: boolean;
  id?: string;
}) {
  return (
    <section id={id} className={styles.splitSection}>
      <div className={`${styles.splitInner} ${reverse ? styles.reverse : ""}`}>
        <div className={styles.reveal}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2>{title}</h2>
          <p className={styles.body}>{body}</p>
          {children}
        </div>
        {image ? (
          <div className={styles.imageWrap}>
            <Image
              src={image}
              alt=""
              fill
              sizes="(max-width: 900px) 100vw, 50vw"
              className={styles.coverImage}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function ConciergeVideoLibrary() {
  const heroRef = useRef<HTMLVideoElement>(null);
  const [heroPlaying, setHeroPlaying] = useState(false);

  useEffect(() => {
    const video = heroRef.current;
    if (!video) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          reducedMotion.matches ||
          !entry.isIntersecting ||
          entry.intersectionRatio < 0.25
        ) {
          video.pause();
          return;
        }
        void video.play().catch(() => undefined);
      },
      { threshold: [0, 0.1, 0.25, 0.6] },
    );

    const handleMotionChange = () => {
      if (reducedMotion.matches) video.pause();
    };

    observer.observe(video);
    reducedMotion.addEventListener("change", handleMotionChange);
    return () => {
      observer.disconnect();
      reducedMotion.removeEventListener("change", handleMotionChange);
    };
  }, []);

  function toggleHeroPlayback() {
    const hero = heroRef.current;
    if (!hero) return;

    if (!hero.paused) {
      hero.pause();
      return;
    }

    document.querySelectorAll("video").forEach((video) => {
      if (video !== hero) video.pause();
    });
    void hero.play().catch(() => undefined);
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <video
          ref={heroRef}
          className={styles.heroVideo}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/videos/avantia-hero-background-v13-mobile-poster.png"
          aria-label="Construction materials arriving at an active project"
          onPlay={() => setHeroPlaying(true)}
          onPause={() => setHeroPlaying(false)}
        >
          <source
            media="(min-width: 640px)"
            src="/videos/avantia-hero-background-v13-desktop.webm"
            type="video/webm"
          />
          <source
            src="/videos/avantia-hero-background-v13-mobile.webm"
            type="video/webm"
          />
          <source
            src="/videos/avantia-hero-background-v13-mobile.mp4"
            type="video/mp4"
          />
        </video>
        <div className={styles.heroShade} />
        <button
          type="button"
          className={styles.heroControl}
          onClick={toggleHeroPlayback}
          aria-label={
            heroPlaying ? "Pause background video" : "Play background video"
          }
        >
          {heroPlaying ? (
            <Pause aria-hidden="true" />
          ) : (
            <Play aria-hidden="true" />
          )}
        </button>
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>Avantia Build</p>
          <h1>
            Everything your project needs.
            <br />
            <em>One materials concierge.</em>
          </h1>
          <p>
            Plans, pricing, sourcing, ordering, and delivery
            coordination—organized through one materials desk.
          </p>
          <div className={styles.actions}>
            <Link href="/shop" className={styles.primary}>
              Send a material request <ArrowRight aria-hidden="true" />
            </Link>
            <a href="#how-it-works" className={styles.secondary}>
              See how Avantia works
            </a>
          </div>
        </div>
        <a href="#problem" className={styles.scrollCue}>
          Scroll to explore <ArrowDown aria-hidden="true" />
        </a>
      </section>

      <section id="problem" className={styles.darkSection}>
        <div className={styles.sectionGrid}>
          <div className={styles.stickyCopy}>
            <p className={styles.eyebrow}>The jobsite reality</p>
            <h2>
              One job.
              <br />
              Too many calls.
            </h2>
            <div className={styles.wordRail}>
              {[
                "Dumpster",
                "Lumber",
                "Windows",
                "Roofing",
                "HVAC",
                "Flooring",
                "Drywall",
                "Tile",
                "Doors",
                "Paint",
              ].map((word) => (
                <span key={word}>{word}.</span>
              ))}
            </div>
            <p className={styles.punchline}>
              Different supplier.
              <br />
              Different quote.
              <br />
              Different follow-up.
            </p>
          </div>
          <StoryVideo story={stories.calls} featured />
        </div>
      </section>

      <section id="how-it-works" className={styles.workflow}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>How Avantia works</p>
          <h2>
            One request.
            <br />A more organized job.
          </h2>
        </div>
        <div className={styles.workflowGrid}>
          <StoryVideo story={stories.request} featured />
          <ol className={styles.steps}>
            <li>
              <span>01</span>
              <div>
                <h3>Send it</h3>
                <p>
                  Plan, list, photo, link, quote, finish schedule, or voice
                  note.
                </p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <h3>Review it</h3>
                <p>
                  We help organize quantities, product options, pricing,
                  availability, and delivery details.
                </p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <h3>Approve it</h3>
                <p>
                  You remain in control. Ordering moves forward after approval.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      <SplitSection
        eyebrow="For contractors"
        title="Keep the crew working. Keep the schedule moving."
        body="Missing materials waste workers’ time. Avantia helps contractors organize requests, compare practical options, coordinate delivery, and solve the forgotten material problems that stop the job."
        image="/images/buildflow-retail/framing-jobsite-v3.webp"
      >
        <div className={styles.microStatements}>
          <span>Send it from the jobsite.</span>
          <span>Approve it from your phone.</span>
          <span>Keep building.</span>
        </div>
      </SplitSection>

      <section className={styles.storyBand}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>For contractors</p>
          <h2>Built for the way jobs actually move.</h2>
        </div>
        <div className={styles.singleStory}>
          <StoryVideo story={stories.crew} featured />
        </div>
      </section>

      <section className={styles.darkSection}>
        <div className={styles.sectionGrid}>
          <div className={styles.stickyCopy}>
            <p className={styles.eyebrow}>Price and quantity visibility</p>
            <h2>What did the material actually cost?</h2>
            <p className={styles.body}>
              When labor and material arrive as one number, it can be difficult
              to understand the material cost. Send the quote, plan, or material
              list. We can help check quantities, price the material separately,
              and provide another option before approval.
            </p>
            <p className={styles.callout}>
              Keep your sub. Keep your supplier.
              <br />
              Use Avantia wherever you need clarity.
            </p>
          </div>
          <StoryVideo story={stories.cost} featured />
        </div>
      </section>

      <section className={styles.darkSection}>
        <div className={styles.sectionGrid}>
          <div className={styles.stickyCopy}>
            <p className={styles.eyebrow}>When the job gets busy</p>
            <h2>One missing item can stop the whole day.</h2>
            <p className={styles.body}>
              Send a photo, list, link, plan, or voice note. Avantia can help
              source special and forgotten items, coordinate with
              subcontractors, and follow the request through delivery.
            </p>
            <p className={styles.callout}>
              When the job gets busy,
              <br />
              call your materials concierge.
            </p>
          </div>
          <StoryVideo story={stories.busy} featured />
        </div>
      </section>

      <SplitSection
        eyebrow="For designers"
        title="You choose the design. We help coordinate the materials."
        body="The perfect tile may come from one website, the lighting from another, and the flooring from somewhere else. Send Avantia the product links, selections, or finish schedule. We can organize vendor details and coordinate orders and deliveries after approval."
        image="/images/buildflow-retail/finish.jpg"
      >
        <p className={styles.callout}>
          Every selection. One organized process.
        </p>
      </SplitSection>

      <section className={styles.storyBand}>
        <div className={styles.storySelector}>
          <StoryVideo story={stories["designer-order"]} />
          <StoryVideo story={stories["designer-desk"]} />
        </div>
      </section>

      <SplitSection
        eyebrow="For clients and homeowners"
        title="Your vision should not get lost between suppliers."
        body="Send the products you like—or ask your contractor or designer to work with Avantia. We help organize material details so selections, orders, and delivery information are easier to follow."
        image="/images/buildflow-retail/kitchen.jpg"
        reverse
      >
        <div className={styles.microStatements}>
          <span>You choose.</span>
          <span>Your team approves.</span>
          <span>Avantia helps coordinate.</span>
        </div>
      </SplitSection>

      <section className={styles.supplierSection}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>For suppliers</p>
          <h2>
            Sell construction materials?
            <br />
            Show us what you sell.
          </h2>
          <p className={styles.body}>
            Send catalogs, product lists, current pricing, availability, and
            delivery coverage. When a product, price, and project are a good
            fit, the supplier may be presented as an option.
          </p>
        </div>
        <div className={styles.storySelector}>
          <StoryVideo story={stories.suppliers} />
          <StoryVideo story={stories.products} />
        </div>
        <p className={styles.centerCallout}>
          Better supplier options start with better information.
        </p>
      </section>

      <section className={styles.sendSection}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>What customers can send</p>
          <h2>
            If you can send it,
            <br />
            we can help organize it.
          </h2>
        </div>
        <div className={styles.sendRail}>
          {[
            "Plans",
            "Photos",
            "Lists",
            "Links",
            "Quotes",
            "Finish schedules",
            "Voice notes",
            "Special requests",
          ].map((item, index) => (
            <div key={item}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{item}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.categories}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Across the entire project</p>
          <h2>One desk. Every material category.</h2>
        </div>
        <div className={styles.categoryGrid}>
          {[
            [
              "Framing & lumber",
              "/images/buildflow-retail/framing-materials-yard.webp",
            ],
            [
              "Roofing & siding",
              "/images/buildflow-retail/roofing-department.webp",
            ],
            ["Windows", "/images/buildflow-retail/windows-department.webp"],
            ["HVAC & mechanical", "/images/buildflow-retail/roughIn.jpg"],
            ["Plumbing", "/images/materials/photos/plumbing.jpg"],
            [
              "Electrical",
              "/images/buildflow-retail/electrical-department-cutout-v2.webp",
            ],
            ["Sheet Rock", "/images/buildflow-retail/drywall-department.webp"],
            ["Tile & stone", "/images/buildflow-retail/tile-department.webp"],
            [
              "Flooring & wood flooring",
              "/images/buildflow-retail/flooring-department.webp",
            ],
            ["Doors", "/images/materials/photos/doors.jpg"],
            ["Molding & millwork", "/images/buildflow-retail/millwork.jpg"],
            ["Paint & finishes", "/images/buildflow-retail/finish.jpg"],
            ["Lighting & fixtures", "/images/materials/photos/lighting.jpg"],
            ["Hardware", "/images/materials/photos/hardware.jpg"],
            ["Concrete & masonry", "/images/materials/photos/concrete.jpg"],
            ["Special & custom items", "/images/buildflow-retail/uploads.jpg"],
          ].map(([label, image]) => (
            <article key={label}>
              <Image
                src={image}
                alt=""
                fill
                sizes="(max-width: 640px) 50vw, 25vw"
              />
              <span>{label}</span>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.finalCta}>
        <Image
          src="/images/shop-showroom/avantia-material-delivery-cinematic.webp"
          alt=""
          fill
          sizes="100vw"
          className={styles.coverImage}
        />
        <div className={styles.finalShade} />
        <div>
          <Image
            src="/images/avantia/avantia-build-lockup-navy.webp"
            width={250}
            height={84}
            alt="Avantia Build"
            className={styles.logo}
          />
          <h2>
            Send the request.
            <br />
            Keep the project moving.
          </h2>
          <p>
            Start with one plan, list, photo, quote, product link, or voice
            note.
          </p>
          <div className={styles.actions}>
            <Link href="/shop" className={styles.primary}>
              Request materials <ArrowRight aria-hidden="true" />
            </Link>
            <a href="tel:+15169088319" className={styles.secondary}>
              <Volume2 aria-hidden="true" /> Text (516) 908-8319
            </a>
          </div>
          <a href="mailto:office@build.avantiap.com" className={styles.email}>
            office@build.avantiap.com
          </a>
        </div>
      </section>

    </main>
  );
}
