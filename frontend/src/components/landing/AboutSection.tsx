"use client";

import { motion } from "framer-motion";
import { MessageSquare, Sparkles, Rocket } from "lucide-react";

function GradientBlob() {
  return (
    <motion.div
      className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
      style={{
        background:
          "radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, rgba(34, 211, 238, 0.2) 50%, transparent 70%)",
      }}
      animate={{
        x: [0, 30, -20, 0],
        y: [0, -20, 30, 0],
        scale: [1, 1.1, 0.95, 1],
      }}
      transition={{
        duration: 12,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut",
      }}
    />
  );
}

const cards = [
  {
    icon: MessageSquare,
    title: "Chat",
    description:
      "Describe your app idea and answer a few clarifying questions from our AI agents.",
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    icon: Sparkles,
    title: "Prompt",
    description:
      "Our multi-agent pipeline crafts precise, sequential development prompts tailored to your project.",
    gradient: "from-cyan-400 to-blue-500",
  },
  {
    icon: Rocket,
    title: "Build",
    description:
      "Take your generated prompts into any AI coding tool and build your app step by step.",
    gradient: "from-blue-600 to-cyan-300",
  },
];

export function AboutSection() {
  return (
    <section
      id="about"
      className="relative py-32 bg-gray-50 overflow-hidden"
    >
      <GradientBlob />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <motion.div
          className="text-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl sm:text-5xl md:text-6xl text-black mb-6">
            How it works
          </h2>
          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto">
            From idea to development-ready prompts in three simple steps.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {cards.map((card, index) => (
            <motion.div
              key={card.title}
              className="relative group"
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
            >
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 h-full transition-shadow duration-300 group-hover:shadow-lg">
                <div
                  className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${card.gradient} mb-6`}
                >
                  <card.icon className="w-7 h-7 text-white" />
                </div>

                <h3 className="text-2xl text-black mb-3">{card.title}</h3>
                <p className="text-gray-500 leading-relaxed">
                  {card.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          className="text-center mt-20"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h3 className="text-2xl sm:text-3xl text-black mb-4">
            We&apos;d love to hear from you
          </h3>
          <p className="text-lg text-gray-500 max-w-xl mx-auto mb-8">
            Help us improve Promptr by sharing your thoughts, suggestions, or bug reports.
          </p>
          <motion.a
            href="https://forms.gle/zz8VNXXwsKJPM12M7"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-4 bg-black text-white rounded-full text-lg hover:bg-gray-800 transition-colors"
            whileHover={{ scale: 1.05 }}
          >
            Leave Feedback
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
}
