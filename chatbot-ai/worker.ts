import { pipeline, env } from "@xenova/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true;

let generator: any = null;

self.onmessage = async (e: MessageEvent) => {
  const { text, systemPrompt } = e.data;

  try {
    if (!generator) {
      console.log("Worker: Загрузка доступной модели Qwen1.5-0.5B...");
      generator = await pipeline("text-generation", "Xenova/Qwen1.5-0.5B-Chat");
      self.postMessage({ status: "ready" });
    }

    // Трюк: Даем модели пример правильного ответа, чтобы она вошла в ритм
    const prompt = `<|im_start|>system
${systemPrompt} Отвечай строго на русском. Если не знаешь — пиши "Я не знаю".<|im_end|>
<|im_start|>user
привет<|im_end|>
<|im_start|>assistant
Здравствуйте! Я помощник Korshi.kz. Как я могу вам помочь?<|im_end|>
<|im_start|>user
${text}<|im_end|>
<|im_start|>assistant
`;

    const output = await generator(prompt, {
      max_new_tokens: 80,
      temperature: 0.1, // Практически убираем галлюцинации
      repetition_penalty: 1.5,
      do_sample: false,
      return_full_text: false,
      stop_sequences: ["<|im_end|>", "user:", "\n"],
    });

    let generatedText = output[0].generated_text;

    // --- ФИЛЬТР БРЕДА ---
    // 1. Удаляем всё, что не кириллица, знаки препинания и цифры
    generatedText = generatedText.replace(/[^\u0400-\u04FF\s\d.,!?;:-]/g, "").trim();

    // 2. Если модель всё-таки перешла на английский или выдала мусор (меньше 3 букв)
    if (generatedText.length < 3) {
      generatedText = "Извините, я не совсем понял ваш вопрос. Попробуйте перефразировать или обратитесь в поддержку.";
    }

    self.postMessage({ status: "update", output: generatedText });
    self.postMessage({ status: "complete" });

  } catch (error: any) {
    console.error("Worker Error:", error);
    self.postMessage({ status: "error", error: error.message });
  }
};