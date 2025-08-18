---
Date: 20250915
Message Link: https://discord.com/channels/684703559954333727/1397129626987266251/1405933384198262824
Channel: #vanity-market
---

Question:

Is producent of GPU or CPU matter? Or just standard the more powerful the better?

Maybe it's a stupid question, but mostly AMD GPU are not as supported as Nvidia's (drivers, optimalization etc.. )

Answer:

Yes, finding keys on a GPU is orders of magnitude faster than on a CPU. You can see a detailed comparison of the performance difference here: https://github.com/golem-vanity-market/golem-vanity-market-cli/blob/main/PATTERN_GEN_DIFF.md. Regarding CPUs, the more cores CPU has, the faster the key generation is.

Currently, we support CPU and NVIDIA GPUs. Our GPU support relies on CUDA, and you can check out the code for that here: https://github.com/golem-vanity-market/cuda-x-crunch We ship all necessary libraries in the golem image.

We are exploring support for AMD GPUs using OpenCL in the future.
