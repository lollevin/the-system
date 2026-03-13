import { StarFilledIcon } from "@radix-ui/react-icons"

import { cn } from "@/lib/utils"

export const Highlight = ({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) => {
  return (
    <span
      className={cn(
        "bg-primary/10 text-primary rounded-sm px-1 py-0.5 font-[480]",
        className
      )}
    >
      {children}
    </span>
  )
}

export interface TestimonialCardProps {
  name: string
  role: string
  img?: string
  description: React.ReactNode
  className?: string
}

export const TestimonialCard = ({
  description,
  name,
  img,
  role,
  className,
}: TestimonialCardProps) => (
  <article
    aria-label={`Testimonial from ${name}`}
    className={cn(
      "bg-card border-border mb-4 flex w-full break-inside-avoid flex-col justify-between rounded-2xl border p-5 shadow-[0px_0px_10px_1px_rgba(0,0,0,0.04)]",
      className
    )}
  >
    <div className="text-muted-foreground text-base leading-relaxed font-[450]">
      {description}
      <div className="mt-2">
        <p className="sr-only">Rated 5 out of 5 stars</p>
        <div aria-hidden="true" className="flex gap-0.5 py-1">
          <StarFilledIcon className="text-primary size-4" />
          <StarFilledIcon className="text-primary size-4" />
          <StarFilledIcon className="text-primary size-4" />
          <StarFilledIcon className="text-primary size-4" />
          <StarFilledIcon className="text-primary size-4" />
        </div>
      </div>
    </div>

    <div className="mt-4 flex w-full items-center gap-3">
      {img ? (
        <img
          alt={`${name} avatar`}
          className="border-border h-10 w-10 rounded-full border object-cover"
          src={img}
        />
      ) : null}
      <div>
        <p className="text-foreground font-medium">{name}</p>
        <p className="text-muted-foreground text-sm font-normal">{role}</p>
      </div>
    </div>
  </article>
)

const testimonials = [
  {
    name: "Alex Rivera",
    role: "CTO at InnovateTech",
    img: "https://randomuser.me/api/portraits/men/91.jpg",
    description: (
      <p>
        The AI-driven analytics from #QuantumInsights have revolutionized our
        product development cycle.
        <Highlight>
          Insights are now more accurate and faster than ever.
        </Highlight>{" "}
        A game-changer for tech companies.
      </p>
    ),
  },
  {
    name: "Samantha Lee",
    role: "Marketing Director at NextGen Solutions",
    img: "https://randomuser.me/api/portraits/women/12.jpg",
    description: (
      <p>
        Implementing #AIStream's customer prediction model has drastically
        improved our targeting strategy.
        <Highlight>Seeing a 50% increase in conversion rates!</Highlight> Highly
        recommend their solutions.
      </p>
    ),
  },
  {
    name: "Raj Patel",
    role: "Founder & CEO at StartUp Grid",
    img: "https://randomuser.me/api/portraits/men/45.jpg",
    description: (
      <p>
        As a startup, we need to move fast and stay ahead. #CodeAI's automated
        coding assistant helps us do just that.
        <Highlight>Our development speed has doubled.</Highlight> Essential tool
        for any startup.
      </p>
    ),
  },
  {
    name: "Emily Chen",
    role: "Product Manager at Digital Wave",
    img: "https://randomuser.me/api/portraits/women/83.jpg",
    description: (
      <p>
        #VoiceGen's AI-driven voice synthesis has made creating global products
        a breeze.
        <Highlight>Localization is now seamless and efficient.</Highlight> A
        must-have for global product teams.
      </p>
    ),
  },
  {
    name: "Michael Brown",
    role: "Data Scientist at FinTech Innovations",
    img: "https://randomuser.me/api/portraits/men/1.jpg",
    description: (
      <p>
        Leveraging #DataCrunch's AI for our financial models has given us an
        edge in predictive accuracy.
        <Highlight>
          Our investment strategies are now powered by real-time data analytics.
        </Highlight>{" "}
        Transformative for the finance industry.
      </p>
    ),
  },
  {
    name: "Linda Wu",
    role: "VP of Operations at LogiChain Solutions",
    img: "https://randomuser.me/api/portraits/women/5.jpg",
    description: (
      <p>
        #LogiTech's supply chain optimization tools have drastically reduced our
        operational costs.
        <Highlight>
          Efficiency and accuracy in logistics have never been better.
        </Highlight>{" "}
      </p>
    ),
  },
  {
    name: "Carlos Gomez",
    role: "Head of R&D at EcoInnovate",
    img: "https://randomuser.me/api/portraits/men/14.jpg",
    description: (
      <p>
        By integrating #GreenTech's sustainable energy solutions, we've seen a
        significant reduction in carbon footprint.
        <Highlight>
          Leading the way in eco-friendly business practices.
        </Highlight>{" "}
        Pioneering change in the industry.
      </p>
    ),
  },
  {
    name: "Aisha Khan",
    role: "Chief Marketing Officer at Fashion Forward",
    img: "https://randomuser.me/api/portraits/women/56.jpg",
    description: (
      <p>
        #TrendSetter's market analysis AI has transformed how we approach
        fashion trends.
        <Highlight>
          Our campaigns are now data-driven with higher customer engagement.
        </Highlight>{" "}
        Revolutionizing fashion marketing.
      </p>
    ),
  },
  {
    name: "Tom Chen",
    role: "Director of IT at HealthTech Solutions",
    img: "https://randomuser.me/api/portraits/men/18.jpg",
    description: (
      <p>
        Implementing #MediCareAI in our patient care systems has improved
        patient outcomes significantly.
        <Highlight>
          Technology and healthcare working hand in hand for better health.
        </Highlight>{" "}
        A milestone in medical technology.
      </p>
    ),
  },
  // {
  //   name: "Sofia Patel",
  //   role: "CEO at EduTech Innovations",
  //   description: (
  //     <p>
  //       #LearnSmart's AI-driven personalized learning plans have doubled student
  //       performance metrics.
  //       <Highlight>Education tailored to every learner's needs.</Highlight>{" "}
  //       Transforming the educational landscape.
  //     </p>
  //   ),
  // },
  // {
  //   name: "Jake Morrison",
  //   role: "CTO at SecureNet Tech",
  //   description: (
  //     <p>
  //       With #CyberShield's AI-powered security systems, our data protection
  //       levels are unmatched.
  //       <Highlight>Ensuring safety and trust in digital spaces.</Highlight>{" "}
  //       Redefining cybersecurity standards.
  //     </p>
  //   ),
  // },
  // {
  //   name: "Nadia Ali",
  //   role: "Product Manager at Creative Solutions",
  //   description: (
  //     <p>
  //       #DesignPro's AI has streamlined our creative process, enhancing
  //       productivity and innovation.
  //       <Highlight>Bringing creativity and technology together.</Highlight> A
  //       game-changer for creative industries.
  //     </p>
  //   ),
  // },
  // {
  //   name: "Omar Farooq",
  //   role: "Founder at Startup Hub",
  //   description: (
  //     <p>
  //       #VentureAI's insights into startup ecosystems have been invaluable for
  //       our growth and funding strategies.
  //       <Highlight>Empowering startups with data-driven decisions.</Highlight> A
  //       catalyst for startup success.
  //     </p>
  //   ),
  // },
]

export function SocialProofTestimonials() {
  return (
    <section id="testimonials">
      <div className="p-4 md:p-6">
        <div className="relative max-h-[700px] overflow-hidden">
          <div className="gap-4 md:columns-2 lg:columns-3 xl:columns-4">
            {testimonials.map((card) => (
              <TestimonialCard {...card} key={card.name} />
            ))}
          </div>
          <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-1/2 w-full bg-linear-to-t from-20%"></div>
        </div>
      </div>
    </section>
  )
}
