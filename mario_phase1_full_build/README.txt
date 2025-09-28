
NTE GPI - Mario-style Fase 1 (Full Build)
----------------------------------------
Conteúdo:
- index.html
- main.js
- assets/player.png   (use o PNG que você enviou)
- assets/enemies.png  (spritesheet / tiles image)
- assets/jump.wav     (small placeholder sound)

Como executar localmente:
1) Extraia o zip
2) Na pasta do projeto rode:
   python -m http.server 8000
   e abra http://localhost:8000
3) Para deploy no Netlify ou GitHub Pages apenas arraste a pasta ou faça commit para o repositório.

Notas:
- Se o player não aparecer verifique se 'assets/player.png' está presente no deploy.
- Limpe cache do navegador se ver versões antigas.
- Posso gerar versões com spritesheet de animações (run/jump) se você enviar frames do personagem.
