"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Home, Trophy, Play, Settings, RefreshCw, Shuffle, Volume2 } from "lucide-react";

// 音效选项
const HIT_SOUNDS = [
  { id: "hit1", name: "击打声", path: "/assets/光厂音效_5996_武器击打身体.mp3" },
  { id: "scream1", name: "儿童惊呼", path: "/assets/光厂音效_6609_儿童受伤惊呼.mp3" },
  { id: "dwarf", name: "矮人受伤", path: "/assets/光厂音效_6731_男性矮人受伤声.mp3" },
  { id: "shout", name: "喊叫+警报", path: "/assets/光厂音效_55435_人声喊叫打他与电子警报音.mp3" },
  { id: "moo", name: "奶牛哞叫", path: "/assets/光厂音效_92957_奶牛连续哞叫声.mp3" },
];

interface GameState {
  screen: "start" | "customize" | "game" | "end" | "leaderboard";
  score: number;
  combo: number;
  maxCombo: number;
  gameTime: number;
  maxTime: number;
  bossIsMoving: boolean;
  isPlaying: boolean;
  isNoTimeLimit: boolean; // 是否是不记时模式
  customBoss: CustomBoss;
  bossPosition: { x: number; y: number };
  bossVelocity: { dx: number; dy: number };
  selectedSound: string; // 选中的音效ID
}

interface CustomBoss {
  // 面部
  faceShape: "circle" | "square" | "oval";
  skinColor: string;
  // 眼睛
  eyeSize: number;
  eyeSpacing: number;
  eyeColor: string;
  eyeType: "round" | "slanted" | "wide";
  // 鼻子
  noseSize: number;
  noseType: "none" | "small" | "big" | "pointed";
  // 嘴巴
  mouthSize: number;
  mouthShape: "smile" | "frown" | "neutral" | "open" | "laugh";
  mouthColor: string;
  // 头发
  hairStyle: "none" | "short" | "long" | "bald" | "mohawk" | "curly";
  hairColor: string;
  // 眉毛
  eyebrowThickness: number;
  eyebrowShape: "straight" | "arched" | "thick" | "none";
  // 身体
  bodyType: "thin" | "normal" | "fat";
  // 衣服
  topStyle: "none" | "shirt" | "tshirt" | "suit" | "dress";
  topColor: string;
  pantsStyle: "none" | "jeans" | "pants" | "skirt" | "shorts";
  pantsColor: string;
  // 鞋子
  shoesStyle: "none" | "sneakers" | "boots" | "formal" | "barefoot";
  shoesColor: string;
  // 配饰
  accessoryStyle: "none" | "glasses" | "hat" | "necklace" | "bowtie";
  accessoryColor: string;
  customImageUrl?: string;
}

interface GameState {
  screen: "start" | "customize" | "game" | "end" | "leaderboard";
  score: number;
  combo: number;
  maxCombo: number;
  gameTime: number;
  maxTime: number;
  bossIsMoving: boolean;
  isPlaying: boolean;
  customBoss: CustomBoss;
  bossPosition: { x: number; y: number };
  bossVelocity: { dx: number; dy: number };
}

// 默认自定义老板配置
const defaultCustomBoss: CustomBoss = {
  faceShape: "circle",
  skinColor: "#ffdbac",
  eyeSize: 12,
  eyeSpacing: 35,
  eyeColor: "#000000",
  eyeType: "round",
  noseSize: 10,
  noseType: "small",
  mouthSize: 35,
  mouthShape: "smile",
  mouthColor: "#cc6666",
  hairStyle: "short",
  hairColor: "#333333",
  eyebrowThickness: 3,
  eyebrowShape: "straight",
  bodyType: "normal",
  topStyle: "shirt",
  topColor: "#3498db",
  pantsStyle: "jeans",
  pantsColor: "#2c3e50",
  shoesStyle: "sneakers",
  shoesColor: "#34495e",
  accessoryStyle: "none",
  accessoryColor: "#ff6b6b",
};

export default function Game() {
  const [gameState, setGameState] = useState<GameState>({
    screen: "start",
    score: 0,
    combo: 0,
    maxCombo: 0,
    gameTime: 0,
    maxTime: 120,
    bossIsMoving: true,
    isPlaying: false,
    isNoTimeLimit: false, // 默认是记时模式
    customBoss: defaultCustomBoss,
    bossPosition: { x: 300, y: 160 },
    bossVelocity: { dx: 3, dy: 3 },
    selectedSound: "hit1", // 默认音效
  });

  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [playerName, setPlayerName] = useState("");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gameLoopRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(Date.now());
  const audioBuffersRef = useRef<Record<string, AudioBuffer | null>>({}); // 缓存音频数据

  // 加载音频文件
  const loadAudio = async (path: string): Promise<AudioBuffer | null> => {
    const audioCtx = initAudio();
    try {
      const response = await fetch(path);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      return audioBuffer;
    } catch (error) {
      console.error("加载音频失败:", path, error);
      return null;
    }
  };

  // 初始化音频
  const initAudio = () => {
    if (!audioContextRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContextClass({ latencyHint: 'interactive' });
    }
    return audioContextRef.current;
  };

  // 监听游戏结束，自动跳转到结算界面（仅记时模式）
  useEffect(() => {
    if (gameState.screen === "game" && !gameState.isPlaying && !gameState.isNoTimeLimit && gameState.gameTime >= gameState.maxTime) {
      setGameState((prev) => ({ ...prev, screen: "end" }));
    }
  }, [gameState.screen, gameState.isPlaying, gameState.gameTime, gameState.maxTime, gameState.isNoTimeLimit]);

  // 监听不记时模式手动结束游戏
  useEffect(() => {
    if (gameState.screen === "game" && !gameState.isPlaying && gameState.isNoTimeLimit) {
      setGameState((prev) => ({ ...prev, screen: "end" }));
    }
  }, [gameState.screen, gameState.isPlaying, gameState.isNoTimeLimit]);

  // 播放击中音效（支持文件音效和合成音效）
  const playHitSound = async () => {
    const audioCtx = initAudio();
    const sound = HIT_SOUNDS.find(s => s.id === gameState.selectedSound);

    if (sound) {
      // 使用文件音效
      let audioBuffer = audioBuffersRef.current[sound.id];

      if (!audioBuffer) {
        audioBuffer = await loadAudio(sound.path);
        if (audioBuffer) {
          audioBuffersRef.current[sound.id] = audioBuffer;
        }
      }

      if (audioBuffer) {
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.start(0);
        return;
      }
    }

    // 如果文件加载失败，使用合成音效作为备用
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

    oscillator.type = "sawtooth";
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.2);
  };

  // 播放游戏结束音效
  const playGameOverSound = () => {
    const audioCtx = initAudio();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.frequency.setValueAtTime(300, audioCtx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.5);

    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

    oscillator.type = "triangle";
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.5);
  };

  // 获取排行榜数据
  const fetchLeaderboard = async () => {
    try {
      const response = await fetch("/api/leaderboard?limit=100");
      const result = await response.json();
      if (result.success) {
        setLeaderboard(result.data);
      }
    } catch (error) {
      console.error("获取排行榜失败:", error);
    }
  };

  // 上传成绩到排行榜
  const submitScore = async () => {
    if (!playerName.trim()) {
      alert("请输入玩家名称");
      return;
    }

    try {
      const response = await fetch("/api/leaderboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerName: playerName.trim(),
          score: gameState.score,
          maxCombo: gameState.maxCombo,
          gameMode: gameState.bossIsMoving ? "moving" : "static",
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert("成绩已保存！");
        fetchLeaderboard();
        setGameState((prev) => ({ ...prev, screen: "leaderboard" }));
      } else {
        alert("保存失败，请重试");
      }
    } catch (error) {
      console.error("提交成绩失败:", error);
      alert("保存失败，请重试");
    }
  };

  // 开始游戏
  const startGame = (isMoving: boolean = true, isNoTimeLimit: boolean = false) => {
    setGameState((prev) => ({
      ...prev,
      screen: "game",
      score: 0,
      combo: 0,
      maxCombo: 0,
      gameTime: 0,
      bossIsMoving: isMoving,
      isNoTimeLimit: isNoTimeLimit,
      isPlaying: true,
      bossPosition: { x: 300, y: 160 },
      bossVelocity: { dx: 3, dy: 3 },
    }));

    lastTimeRef.current = Date.now();
  };

  // 手动结束游戏（仅不记时模式）
  const endGame = () => {
    playGameOverSound();
    setGameState((prev) => ({
      ...prev,
      isPlaying: false,
    }));
  };

  // 处理Canvas点击
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!gameState.isPlaying) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const bossX = gameState.bossPosition.x;
    const bossY = gameState.bossPosition.y;
    const bossWidth = 200;
    const bossHeight = 200;

    if (x >= bossX && x <= bossX + bossWidth && y >= bossY && y <= bossY + bossHeight) {
      const newCombo = gameState.combo + 1;
      const hitScore = 10 + (newCombo - 1) * 5;
      const newScore = gameState.score + hitScore;

      playHitSound();

      // 击中时加速移动
      if (gameState.bossIsMoving) {
        const speedMultiplier = 1 + Math.min(newCombo * 0.1, 2);
        setGameState((prev) => ({
          ...prev,
          score: newScore,
          combo: newCombo,
          maxCombo: Math.max(prev.maxCombo, newCombo),
          bossVelocity: {
            dx: prev.bossVelocity.dx * (prev.bossVelocity.dx >= 0 ? speedMultiplier : -speedMultiplier),
            dy: prev.bossVelocity.dy * (prev.bossVelocity.dy >= 0 ? speedMultiplier : -speedMultiplier),
          },
        }));
      } else {
        setGameState((prev) => ({
          ...prev,
          score: newScore,
          combo: newCombo,
          maxCombo: Math.max(prev.maxCombo, newCombo),
        }));
      }
    } else {
      setGameState((prev) => ({
        ...prev,
        combo: 0,
      }));
    }
  };

  // 随机生成角色
  const randomizeCharacter = () => {
    const randomColor = () => '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
    const skinColors = ['#ffdbac', '#f8c291', '#fad390', '#e58e26', '#d6a283', '#a57e52', '#ffeaa7', '#fdcb6e'];
    const faceShapes: CustomBoss["faceShape"][] = ["circle", "square", "oval"];
    const eyeTypes: CustomBoss["eyeType"][] = ["round", "slanted", "wide"];
    const noseTypes: CustomBoss["noseType"][] = ["none", "small", "big", "pointed"];
    const mouthShapes: CustomBoss["mouthShape"][] = ["smile", "frown", "neutral", "open", "laugh"];
    const hairStyles: CustomBoss["hairStyle"][] = ["none", "short", "long", "bald", "mohawk", "curly"];
    const eyebrowShapes: CustomBoss["eyebrowShape"][] = ["straight", "arched", "thick", "none"];
    const bodyTypes: CustomBoss["bodyType"][] = ["thin", "normal", "fat"];
    const topStyles: CustomBoss["topStyle"][] = ["none", "shirt", "tshirt", "suit", "dress"];
    const pantsStyles: CustomBoss["pantsStyle"][] = ["none", "jeans", "pants", "skirt", "shorts"];
    const shoesStyles: CustomBoss["shoesStyle"][] = ["none", "sneakers", "boots", "formal", "barefoot"];
    const accessoryStyles: CustomBoss["accessoryStyle"][] = ["none", "glasses", "hat", "necklace", "bowtie"];

    const newBoss: CustomBoss = {
      ...gameState.customBoss,
      faceShape: faceShapes[Math.floor(Math.random() * faceShapes.length)],
      skinColor: skinColors[Math.floor(Math.random() * skinColors.length)],
      eyeSize: Math.floor(Math.random() * 16) + 8,
      eyeSpacing: Math.floor(Math.random() * 31) + 25,
      eyeColor: randomColor(),
      eyeType: eyeTypes[Math.floor(Math.random() * eyeTypes.length)],
      noseSize: Math.floor(Math.random() * 15) + 5,
      noseType: noseTypes[Math.floor(Math.random() * noseTypes.length)],
      mouthSize: Math.floor(Math.random() * 31) + 25,
      mouthShape: mouthShapes[Math.floor(Math.random() * mouthShapes.length)],
      mouthColor: randomColor(),
      hairStyle: hairStyles[Math.floor(Math.random() * hairStyles.length)],
      hairColor: randomColor(),
      eyebrowThickness: Math.floor(Math.random() * 8) + 1,
      eyebrowShape: eyebrowShapes[Math.floor(Math.random() * eyebrowShapes.length)],
      bodyType: bodyTypes[Math.floor(Math.random() * bodyTypes.length)],
      topStyle: topStyles[Math.floor(Math.random() * topStyles.length)],
      topColor: randomColor(),
      pantsStyle: pantsStyles[Math.floor(Math.random() * pantsStyles.length)],
      pantsColor: randomColor(),
      shoesStyle: shoesStyles[Math.floor(Math.random() * shoesStyles.length)],
      shoesColor: randomColor(),
      accessoryStyle: accessoryStyles[Math.floor(Math.random() * accessoryStyles.length)],
      accessoryColor: randomColor(),
    };

    setGameState((prev) => ({ ...prev, customBoss: newBoss }));
  };

  // 游戏主循环
  useEffect(() => {
    if (gameState.screen !== "game" || !gameState.isPlaying) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gameLoop = () => {
      const currentTime = Date.now();
      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      const newGameTime = gameState.gameTime + deltaTime;

      // 只有记时模式才会因为时间到达而结束
      if (!gameState.isNoTimeLimit && newGameTime >= gameState.maxTime) {
        playGameOverSound();
        setGameState((prev) => ({
          ...prev,
          isPlaying: false,
          gameTime: newGameTime,
        }));
        return;
      }

      // 更新老板位置
      let newX = gameState.bossPosition.x;
      let newY = gameState.bossPosition.y;
      let newDx = gameState.bossVelocity.dx;
      let newDy = gameState.bossVelocity.dy;

      if (gameState.bossIsMoving) {
        newX += newDx;
        newY += newDy;

        // 边界检测
        const bossWidth = 200;
        const bossHeight = 200;

        if (newX <= 0 || newX + bossWidth >= canvas.width) {
          newDx *= -1;
          newX = Math.max(0, Math.min(newX, canvas.width - bossWidth));
        }
        if (newY <= 0 || newY + bossHeight >= canvas.height) {
          newDy *= -1;
          newY = Math.max(0, Math.min(newY, canvas.height - bossHeight));
        }
      } else {
        // 静止模式，居中
        newX = canvas.width / 2 - 100;
        newY = canvas.height / 2 - 100;
      }

      setGameState((prev) => ({
        ...prev,
        gameTime: newGameTime,
        bossPosition: { x: newX, y: newY },
        bossVelocity: { dx: newDx, dy: newDy },
      }));

      // 清空画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 绘制背景
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 绘制老板
      drawBoss(ctx, newX, newY, 200, 200);

      // 绘制连击提示
      if (gameState.combo > 0) {
        ctx.fillStyle = `rgba(255, 107, 107, ${Math.min(gameState.combo * 0.1, 1)})`;
        ctx.font = `bold ${30 + Math.min(gameState.combo, 30)}px Arial`;
        ctx.textAlign = "center";
        ctx.fillText(`${gameState.combo} 连击!`, canvas.width / 2, 50);
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.screen, gameState.isPlaying, gameState.gameTime, gameState.combo, gameState.score, gameState.customBoss, gameState.bossIsMoving, gameState.isNoTimeLimit]);

  // 绘制老板函数
  const drawBoss = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
    const cust = gameState.customBoss;

    // 身体宽度调整
    let bodyWidth = width * 0.8;
    if (cust.bodyType === "thin") bodyWidth = width * 0.6;
    if (cust.bodyType === "fat") bodyWidth = width * 1.0;

    const bodyX = x + (width - bodyWidth) / 2;
    const bodyY = y + height * 0.5;
    const bodyHeight = height * 0.5;

    // 计算眼睛位置（提前计算，供配饰使用）
    const headX = x + width / 2 - width * 0.25;
    const headY = y;
    const headSize = width * 0.5;
    const headCenterX = headX + headSize / 2;
    const headCenterY = headY + headSize / 2;
    const eyeY = headY + headSize * 0.4;
    const leftEyeX = headCenterX - cust.eyeSpacing / 2;
    const rightEyeX = headCenterX + cust.eyeSpacing / 2;

    // 绘制身体
    if (cust.topStyle !== "none") {
      ctx.fillStyle = cust.topColor;
      switch (cust.topStyle) {
        case "shirt":
          ctx.fillRect(bodyX, bodyY, bodyWidth, bodyHeight * 0.5);
          // 领子
          ctx.fillStyle = adjustColor(cust.topColor, -20);
          ctx.beginPath();
          ctx.moveTo(bodyX + bodyWidth * 0.3, bodyY);
          ctx.lineTo(bodyX + bodyWidth * 0.5, bodyY + bodyHeight * 0.15);
          ctx.lineTo(bodyX + bodyWidth * 0.7, bodyY);
          ctx.closePath();
          ctx.fill();
          break;
        case "tshirt":
          ctx.fillRect(bodyX, bodyY, bodyWidth, bodyHeight * 0.4);
          ctx.beginPath();
          ctx.arc(bodyX + bodyWidth * 0.5, bodyY, bodyWidth * 0.25, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "suit":
          ctx.fillStyle = "#2c3e50";
          ctx.fillRect(bodyX, bodyY, bodyWidth, bodyHeight * 0.5);
          ctx.fillStyle = cust.topColor;
          ctx.fillRect(bodyX + bodyWidth * 0.45, bodyY, bodyWidth * 0.1, bodyHeight * 0.5);
          // 领带
          ctx.beginPath();
          ctx.moveTo(bodyX + bodyWidth * 0.5, bodyY);
          ctx.lineTo(bodyX + bodyWidth * 0.55, bodyY + bodyHeight * 0.3);
          ctx.lineTo(bodyX + bodyWidth * 0.5, bodyY + bodyHeight * 0.4);
          ctx.lineTo(bodyX + bodyWidth * 0.45, bodyY + bodyHeight * 0.3);
          ctx.closePath();
          ctx.fill();
          break;
        case "dress":
          ctx.beginPath();
          ctx.moveTo(bodyX + bodyWidth * 0.2, bodyY);
          ctx.lineTo(bodyX + bodyWidth * 0.8, bodyY);
          ctx.lineTo(bodyX + bodyWidth * 1.1, bodyY + bodyHeight);
          ctx.lineTo(bodyX - bodyWidth * 0.1, bodyY + bodyHeight);
          ctx.closePath();
          ctx.fill();
          break;
      }
    }

    // 绘制裤子
    if (cust.pantsStyle !== "none") {
      ctx.fillStyle = cust.pantsColor;
      switch (cust.pantsStyle) {
        case "jeans":
          ctx.fillRect(bodyX + bodyWidth * 0.1, bodyY + bodyHeight * 0.5, bodyWidth * 0.35, bodyHeight * 0.4);
          ctx.fillRect(bodyX + bodyWidth * 0.55, bodyY + bodyHeight * 0.5, bodyWidth * 0.35, bodyHeight * 0.4);
          break;
        case "pants":
          ctx.fillRect(bodyX + bodyWidth * 0.15, bodyY + bodyHeight * 0.5, bodyWidth * 0.7, bodyHeight * 0.4);
          break;
        case "shorts":
          ctx.fillRect(bodyX + bodyWidth * 0.1, bodyY + bodyHeight * 0.5, bodyWidth * 0.35, bodyHeight * 0.2);
          ctx.fillRect(bodyX + bodyWidth * 0.55, bodyY + bodyHeight * 0.5, bodyWidth * 0.35, bodyHeight * 0.2);
          break;
        case "skirt":
          ctx.beginPath();
          ctx.moveTo(bodyX + bodyWidth * 0.2, bodyY + bodyHeight * 0.5);
          ctx.lineTo(bodyX + bodyWidth * 0.8, bodyY + bodyHeight * 0.5);
          ctx.lineTo(bodyX + bodyWidth, bodyY + bodyHeight);
          ctx.lineTo(bodyX, bodyY + bodyHeight);
          ctx.closePath();
          ctx.fill();
          break;
      }
    }

    // 绘制头部
    if (cust.customImageUrl) {
      const img = new Image();
      img.src = cust.customImageUrl;
      if (img.complete) {
        ctx.save();
        ctx.beginPath();
        switch (cust.faceShape) {
          case "circle":
            ctx.arc(headCenterX, headCenterY, headSize / 2, 0, Math.PI * 2);
            break;
          case "square":
            ctx.rect(headX, headY, headSize, headSize);
            break;
          case "oval":
            ctx.ellipse(headCenterX, headCenterY, headSize / 2, headSize * 0.6, 0, 0, Math.PI * 2);
            break;
        }
        ctx.clip();
        ctx.drawImage(img, headX, headY, headSize, headSize);
        ctx.restore();
      }
    } else {
      // 绘制脸部
      ctx.fillStyle = cust.skinColor;
      ctx.beginPath();
      switch (cust.faceShape) {
        case "circle":
          ctx.arc(headCenterX, headCenterY, headSize / 2, 0, Math.PI * 2);
          break;
        case "square":
          const radius = headSize * 0.1;
          ctx.roundRect(headX, headY, headSize, headSize, radius);
          break;
        case "oval":
          ctx.ellipse(headCenterX, headCenterY, headSize / 2, headSize * 0.6, 0, 0, Math.PI * 2);
          break;
      }
      ctx.fill();

      // 绘制鼻子
      if (cust.noseType !== "none") {
        ctx.fillStyle = adjustColor(cust.skinColor, -10);
        const noseY = headCenterY;
        const noseSize = cust.noseSize;
        switch (cust.noseType) {
          case "small":
            ctx.beginPath();
            ctx.arc(headCenterX, noseY, noseSize / 2, 0, Math.PI * 2);
            ctx.fill();
            break;
          case "big":
            ctx.beginPath();
            ctx.ellipse(headCenterX, noseY, noseSize / 2, noseSize / 1.5, 0, 0, Math.PI * 2);
            ctx.fill();
            break;
          case "pointed":
            ctx.beginPath();
            ctx.moveTo(headCenterX - noseSize / 2, noseY - noseSize / 2);
            ctx.lineTo(headCenterX + noseSize / 2, noseY - noseSize / 2);
            ctx.lineTo(headCenterX, noseY + noseSize / 2);
            ctx.closePath();
            ctx.fill();
            break;
        }
      }

      // 绘制嘴巴
      const mouthY = headY + headSize * 0.75;
      ctx.strokeStyle = cust.mouthColor;
      ctx.fillStyle = cust.mouthColor;
      ctx.lineWidth = 3;
      switch (cust.mouthShape) {
        case "smile":
          ctx.beginPath();
          ctx.arc(headCenterX, mouthY - cust.mouthSize / 3, cust.mouthSize / 2, 0, Math.PI);
          ctx.stroke();
          break;
        case "frown":
          ctx.beginPath();
          ctx.arc(headCenterX, mouthY + cust.mouthSize / 3, cust.mouthSize / 2, Math.PI, 0);
          ctx.stroke();
          break;
        case "neutral":
          ctx.beginPath();
          ctx.moveTo(headCenterX - cust.mouthSize / 2, mouthY);
          ctx.lineTo(headCenterX + cust.mouthSize / 2, mouthY);
          ctx.stroke();
          break;
        case "open":
          ctx.beginPath();
          ctx.ellipse(headCenterX, mouthY, cust.mouthSize / 3, cust.mouthSize / 2, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "laugh":
          ctx.beginPath();
          ctx.arc(headCenterX, mouthY, cust.mouthSize / 2, 0, Math.PI * 2);
          ctx.fill();
          // 舌头
          ctx.fillStyle = "#ff6b6b";
          ctx.beginPath();
          ctx.arc(headCenterX, mouthY + cust.mouthSize / 4, cust.mouthSize / 3, 0, Math.PI);
          ctx.fill();
          break;
      }

      // 绘制眼睛
      ctx.fillStyle = "white";
      switch (cust.eyeType) {
        case "round":
          ctx.beginPath();
          ctx.arc(leftEyeX, eyeY, cust.eyeSize, 0, Math.PI * 2);
          ctx.arc(rightEyeX, eyeY, cust.eyeSize, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "slanted":
          ctx.beginPath();
          ctx.ellipse(leftEyeX, eyeY, cust.eyeSize * 1.2, cust.eyeSize * 0.8, Math.PI / 6, 0, Math.PI * 2);
          ctx.ellipse(rightEyeX, eyeY, cust.eyeSize * 1.2, cust.eyeSize * 0.8, -Math.PI / 6, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "wide":
          ctx.beginPath();
          ctx.ellipse(leftEyeX, eyeY, cust.eyeSize * 1.5, cust.eyeSize * 0.6, 0, 0, Math.PI * 2);
          ctx.ellipse(rightEyeX, eyeY, cust.eyeSize * 1.5, cust.eyeSize * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
      }

      // 瞳孔
      ctx.fillStyle = cust.eyeColor;
      const pupilSize = cust.eyeSize * 0.4;
      ctx.beginPath();
      ctx.arc(leftEyeX, eyeY, pupilSize, 0, Math.PI * 2);
      ctx.arc(rightEyeX, eyeY, pupilSize, 0, Math.PI * 2);
      ctx.fill();

      // 绘制眉毛
      if (cust.eyebrowShape !== "none") {
        ctx.strokeStyle = cust.hairColor;
        ctx.lineWidth = cust.eyebrowThickness;
        ctx.lineCap = "round";
        const eyebrowY = eyeY - cust.eyeSize - 5;
        switch (cust.eyebrowShape) {
          case "straight":
            ctx.beginPath();
            ctx.moveTo(leftEyeX - cust.eyeSize, eyebrowY);
            ctx.lineTo(leftEyeX + cust.eyeSize, eyebrowY);
            ctx.moveTo(rightEyeX - cust.eyeSize, eyebrowY);
            ctx.lineTo(rightEyeX + cust.eyeSize, eyebrowY);
            ctx.stroke();
            break;
          case "arched":
            ctx.beginPath();
            ctx.moveTo(leftEyeX - cust.eyeSize, eyebrowY + 5);
            ctx.quadraticCurveTo(leftEyeX, eyebrowY - 5, leftEyeX + cust.eyeSize, eyebrowY + 5);
            ctx.moveTo(rightEyeX - cust.eyeSize, eyebrowY + 5);
            ctx.quadraticCurveTo(rightEyeX, eyebrowY - 5, rightEyeX + cust.eyeSize, eyebrowY + 5);
            ctx.stroke();
            break;
          case "thick":
            ctx.lineWidth = cust.eyebrowThickness * 2;
            ctx.beginPath();
            ctx.moveTo(leftEyeX - cust.eyeSize - 5, eyebrowY);
            ctx.lineTo(leftEyeX + cust.eyeSize + 5, eyebrowY);
            ctx.moveTo(rightEyeX - cust.eyeSize - 5, eyebrowY);
            ctx.lineTo(rightEyeX + cust.eyeSize + 5, eyebrowY);
            ctx.stroke();
            break;
        }
      }

      // 绘制头发
      if (cust.hairStyle !== "none") {
        ctx.fillStyle = cust.hairColor;
        switch (cust.hairStyle) {
          case "short":
            ctx.beginPath();
            ctx.arc(headCenterX, headY + headSize * 0.2, headSize * 0.55, Math.PI, 0);
            ctx.fill();
            break;
          case "long":
            ctx.beginPath();
            ctx.arc(headCenterX, headY + headSize * 0.2, headSize * 0.55, Math.PI, 0);
            ctx.fill();
            ctx.fillRect(headX - headSize * 0.1, headY + headSize * 0.15, headSize * 0.25, headSize * 0.6);
            ctx.fillRect(headX + headSize * 0.85, headY + headSize * 0.15, headSize * 0.25, headSize * 0.6);
            break;
          case "bald":
            ctx.fillStyle = adjustColor(cust.skinColor, 10);
            ctx.beginPath();
            ctx.arc(headCenterX, headY + headSize * 0.2, headSize * 0.35, 0, Math.PI * 2);
            ctx.fill();
            break;
          case "mohawk":
            ctx.fillRect(headX + headSize * 0.45, headY - headSize * 0.2, headSize * 0.1, headSize * 0.4);
            break;
          case "curly":
            for (let i = 0; i < 7; i++) {
              ctx.beginPath();
              const cx = headX + headSize * 0.2 + i * headSize * 0.1;
              ctx.arc(cx, headY + headSize * 0.15, headSize * 0.12, 0, Math.PI * 2);
              ctx.fill();
            }
            break;
        }
      }
    }

    // 绘制鞋子
    if (cust.shoesStyle !== "none") {
      ctx.fillStyle = cust.shoesColor;
      const shoesY = y + height * 0.95;
      const shoeWidth = bodyWidth * 0.3;
      switch (cust.shoesStyle) {
        case "sneakers":
          ctx.fillRect(bodyX, shoesY, shoeWidth, 10);
          ctx.fillRect(bodyX + bodyWidth - shoeWidth, shoesY, shoeWidth, 10);
          break;
        case "boots":
          ctx.fillRect(bodyX, shoesY - 15, shoeWidth, 25);
          ctx.fillRect(bodyX + bodyWidth - shoeWidth, shoesY - 15, shoeWidth, 25);
          break;
        case "formal":
          ctx.beginPath();
          ctx.moveTo(bodyX, shoesY + 10);
          ctx.lineTo(bodyX + shoeWidth, shoesY);
          ctx.lineTo(bodyX + shoeWidth + 10, shoesY + 10);
          ctx.closePath();
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(bodyX + bodyWidth - shoeWidth, shoesY + 10);
          ctx.lineTo(bodyX + bodyWidth, shoesY);
          ctx.lineTo(bodyX + bodyWidth + 10, shoesY + 10);
          ctx.closePath();
          ctx.fill();
          break;
      }
    }

    // 绘制配饰
    if (cust.accessoryStyle !== "none") {
      ctx.fillStyle = cust.accessoryColor;
      switch (cust.accessoryStyle) {
        case "glasses":
          ctx.strokeStyle = cust.accessoryColor;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.rect(leftEyeX - cust.eyeSize - 5, eyeY - cust.eyeSize - 5, cust.eyeSize * 2 + 10, cust.eyeSize * 2 + 10);
          ctx.rect(rightEyeX - cust.eyeSize - 5, eyeY - cust.eyeSize - 5, cust.eyeSize * 2 + 10, cust.eyeSize * 2 + 10);
          ctx.moveTo(leftEyeX + cust.eyeSize + 5, eyeY);
          ctx.lineTo(rightEyeX - cust.eyeSize - 5, eyeY);
          ctx.stroke();
          break;
        case "hat":
          ctx.fillRect(headX + headSize * 0.1, headY - headSize * 0.25, headSize * 0.8, headSize * 0.25);
          ctx.fillRect(headX, headY, headSize, headSize * 0.15);
          break;
        case "necklace":
          ctx.strokeStyle = cust.accessoryColor;
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(headCenterX, headY + headSize * 0.85, headSize * 0.3, 0, Math.PI);
          ctx.stroke();
          break;
        case "bowtie":
          ctx.beginPath();
          ctx.moveTo(headCenterX - 15, headY + headSize * 0.7);
          ctx.lineTo(headCenterX + 15, headY + headSize * 0.7);
          ctx.lineTo(headCenterX, headY + headSize * 0.75);
          ctx.closePath();
          ctx.fill();
          break;
      }
    }

    // 绘制连击特效
    if (gameState.combo > 0) {
      ctx.strokeStyle = `rgba(255, 107, 107, ${Math.min(gameState.combo * 0.05, 0.5)})`;
      ctx.lineWidth = 3 + gameState.combo * 0.5;
      ctx.beginPath();
      ctx.arc(x + width / 2, y + height / 2, width * 0.6 + gameState.combo, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  // 调整颜色亮度
  const adjustColor = (color: string, amount: number) => {
    const hex = color.replace("#", "");
    const r = Math.max(0, Math.min(255, parseInt(hex.substring(0, 2), 16) + amount));
    const g = Math.max(0, Math.min(255, parseInt(hex.substring(2, 4), 16) + amount));
    const b = Math.max(0, Math.min(255, parseInt(hex.substring(4, 6), 16) + amount));
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  };

  // 处理图片上传
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        setGameState((prev) => ({
          ...prev,
          customBoss: {
            ...prev.customBoss,
            customImageUrl: result.data.url,
          },
        }));
        alert("图片上传成功！");
      } else {
        alert("图片上传失败：" + result.error);
      }
    } catch (error) {
      console.error("上传失败:", error);
      alert("图片上传失败，请重试");
    }
  };

  // 绘制预览
  useEffect(() => {
    if (gameState.screen === "customize" && previewCanvasRef.current) {
      const canvas = previewCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#f0f0f0";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawBoss(ctx, 50, 50, 200, 200);
    }
  }, [gameState.screen, gameState.customBoss, gameState.combo]);

  // 组件挂载时获取排行榜
  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-400 to-orange-500 p-4">
      <div className="max-w-7xl mx-auto">
        {/* 开始界面 */}
        {gameState.screen === "start" && (
          <div className="flex items-center justify-center min-h-[80vh]">
            <Card className="p-12 bg-white/95 backdrop-blur shadow-2xl">
              <h1 className="text-5xl font-bold text-center mb-8 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                打爆老板
              </h1>
              <div className="space-y-4">
                <Button
                  onClick={() => startGame(true)}
                  className="w-full h-14 text-xl rounded-full shadow-lg hover:shadow-xl transition-all"
                >
                  <Play className="mr-2" />
                  开始游戏（移动模式）
                </Button>
                <Button
                  onClick={() => startGame(false)}
                  variant="outline"
                  className="w-full h-14 text-xl rounded-full shadow-lg hover:shadow-xl transition-all"
                >
                  <RefreshCw className="mr-2" />
                  立正挨打（静止模式）
                </Button>
                <Button
                  onClick={() => startGame(true, true)}
                  variant="secondary"
                  className="w-full h-14 text-xl rounded-full shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600"
                >
                  <Play className="mr-2" />
                  不记时版（自由模式）
                </Button>
                <Button
                  onClick={() => startGame(false, true)}
                  variant="secondary"
                  className="w-full h-14 text-xl rounded-full shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600"
                >
                  <RefreshCw className="mr-2" />
                  不记时版（静止模式）
                </Button>
                <Button
                  onClick={() => setGameState((prev) => ({ ...prev, screen: "customize" }))}
                  variant="secondary"
                  className="w-full h-14 text-xl rounded-full shadow-lg hover:shadow-xl transition-all"
                >
                  <Settings className="mr-2" />
                  自定义老板
                </Button>
                <Button
                  onClick={() => setGameState((prev) => ({ ...prev, screen: "leaderboard" }))}
                  variant="ghost"
                  className="w-full h-14 text-xl rounded-full shadow-lg hover:shadow-xl transition-all"
                >
                  <Trophy className="mr-2" />
                  全网排行榜
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* 自定义界面 */}
        {gameState.screen === "customize" && (
          <div className="p-4">
            <Card className="p-6 bg-white/95 backdrop-blur shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">自定义老板</h2>
                <div className="flex gap-2">
                  <Button
                    onClick={randomizeCharacter}
                    variant="outline"
                  >
                    <Shuffle className="mr-2" />
                    随机生成
                  </Button>
                  <Button
                    onClick={() => setGameState((prev) => ({ ...prev, screen: "start" }))}
                    variant="outline"
                  >
                    <Home className="mr-2" />
                    返回
                  </Button>
                  <Button
                    onClick={() => startGame(true)}
                  >
                    <Play className="mr-2" />
                    开始游戏
                  </Button>
                </div>
              </div>

              <div className="grid lg:grid-cols-3 gap-6">
                {/* 预览区域 */}
                <div className="lg:col-span-1">
                  <div className="space-y-4">
                    {/* 图片上传 */}
                    <div>
                      <Label htmlFor="image-upload" className="text-lg font-semibold">
                        自定义头像
                      </Label>
                      <Input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <label htmlFor="image-upload">
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors">
                          <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-600">点击上传自定义头像</p>
                          {gameState.customBoss.customImageUrl && (
                            <img
                              src={gameState.customBoss.customImageUrl}
                              alt="自定义头像"
                              className="mt-4 mx-auto max-w-[150px] rounded-lg"
                            />
                          )}
                        </div>
                      </label>
                    </div>

                    {/* 预览画布 */}
                    <div>
                      <Label className="text-lg font-semibold mb-2 block">预览</Label>
                      <canvas
                        ref={previewCanvasRef}
                        width={300}
                        height={300}
                        className="w-full border-2 border-gray-300 rounded-lg bg-gray-50"
                      />
                    </div>
                  </div>
                </div>

                {/* 自定义选项 */}
                <div className="lg:col-span-2">
                  <div className="grid md:grid-cols-2 gap-6 max-h-[600px] overflow-y-auto pr-2">
                    {/* 面部特征 */}
                    <Card className="p-4">
                      <h3 className="text-lg font-bold mb-4 border-b pb-2">面部特征</h3>
                      <div className="space-y-4">
                        <div>
                          <Label>脸型</Label>
                          <select
                            value={gameState.customBoss.faceShape}
                            onChange={(e) =>
                              setGameState((prev) => ({
                                ...prev,
                                customBoss: { ...prev.customBoss, faceShape: e.target.value as any },
                              }))
                            }
                            className="mt-1 w-full p-2 border rounded"
                          >
                            <option value="circle">圆形</option>
                            <option value="square">方形</option>
                            <option value="oval">椭圆形</option>
                          </select>
                        </div>
                        <div>
                          <Label>肤色</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              type="color"
                              value={gameState.customBoss.skinColor}
                              onChange={(e) =>
                                setGameState((prev) => ({
                                  ...prev,
                                  customBoss: { ...prev.customBoss, skinColor: e.target.value },
                                }))
                              }
                              className="w-16 h-10"
                            />
                            <input
                              type="text"
                              value={gameState.customBoss.skinColor}
                              onChange={(e) =>
                                setGameState((prev) => ({
                                  ...prev,
                                  customBoss: { ...prev.customBoss, skinColor: e.target.value },
                                }))
                              }
                              className="flex-1 p-2 border rounded"
                            />
                          </div>
                        </div>
                        <div>
                          <Label>体型</Label>
                          <select
                            value={gameState.customBoss.bodyType}
                            onChange={(e) =>
                              setGameState((prev) => ({
                                ...prev,
                                customBoss: { ...prev.customBoss, bodyType: e.target.value as any },
                              }))
                            }
                            className="mt-1 w-full p-2 border rounded"
                          >
                            <option value="thin">瘦</option>
                            <option value="normal">普通</option>
                            <option value="fat">胖</option>
                          </select>
                        </div>
                      </div>
                    </Card>

                    {/* 眼睛 */}
                    <Card className="p-4">
                      <h3 className="text-lg font-bold mb-4 border-b pb-2">眼睛</h3>
                      <div className="space-y-4">
                        <div>
                          <Label>眼睛大小: {gameState.customBoss.eyeSize}</Label>
                          <input
                            type="range"
                            min="5"
                            max="20"
                            value={gameState.customBoss.eyeSize}
                            onChange={(e) =>
                              setGameState((prev) => ({
                                ...prev,
                                customBoss: { ...prev.customBoss, eyeSize: parseInt(e.target.value) },
                              }))
                            }
                            className="w-full"
                          />
                        </div>
                        <div>
                          <Label>眼睛间距: {gameState.customBoss.eyeSpacing}</Label>
                          <input
                            type="range"
                            min="20"
                            max="60"
                            value={gameState.customBoss.eyeSpacing}
                            onChange={(e) =>
                              setGameState((prev) => ({
                                ...prev,
                                customBoss: { ...prev.customBoss, eyeSpacing: parseInt(e.target.value) },
                              }))
                            }
                            className="w-full"
                          />
                        </div>
                        <div>
                          <Label>眼睛类型</Label>
                          <select
                            value={gameState.customBoss.eyeType}
                            onChange={(e) =>
                              setGameState((prev) => ({
                                ...prev,
                                customBoss: { ...prev.customBoss, eyeType: e.target.value as any },
                              }))
                            }
                            className="mt-1 w-full p-2 border rounded"
                          >
                            <option value="round">圆形</option>
                            <option value="slanted">斜眼</option>
                            <option value="wide">宽眼</option>
                          </select>
                        </div>
                        <div>
                          <Label>眼睛颜色</Label>
                          <Input
                            type="color"
                            value={gameState.customBoss.eyeColor}
                            onChange={(e) =>
                              setGameState((prev) => ({
                                ...prev,
                                customBoss: { ...prev.customBoss, eyeColor: e.target.value },
                              }))
                            }
                            className="w-full mt-1"
                          />
                        </div>
                      </div>
                    </Card>

                    {/* 鼻子 */}
                    <Card className="p-4">
                      <h3 className="text-lg font-bold mb-4 border-b pb-2">鼻子</h3>
                      <div className="space-y-4">
                        <div>
                          <Label>鼻子大小: {gameState.customBoss.noseSize}</Label>
                          <input
                            type="range"
                            min="5"
                            max="20"
                            value={gameState.customBoss.noseSize}
                            onChange={(e) =>
                              setGameState((prev) => ({
                                ...prev,
                                customBoss: { ...prev.customBoss, noseSize: parseInt(e.target.value) },
                              }))
                            }
                            className="w-full"
                          />
                        </div>
                        <div>
                          <Label>鼻子类型</Label>
                          <select
                            value={gameState.customBoss.noseType}
                            onChange={(e) =>
                              setGameState((prev) => ({
                                ...prev,
                                customBoss: { ...prev.customBoss, noseType: e.target.value as any },
                              }))
                            }
                            className="mt-1 w-full p-2 border rounded"
                          >
                            <option value="none">无</option>
                            <option value="small">小鼻子</option>
                            <option value="big">大鼻子</option>
                            <option value="pointed">尖鼻子</option>
                          </select>
                        </div>
                      </div>
                    </Card>

                    {/* 嘴巴 */}
                    <Card className="p-4">
                      <h3 className="text-lg font-bold mb-4 border-b pb-2">嘴巴</h3>
                      <div className="space-y-4">
                        <div>
                          <Label>嘴巴大小: {gameState.customBoss.mouthSize}</Label>
                          <input
                            type="range"
                            min="20"
                            max="60"
                            value={gameState.customBoss.mouthSize}
                            onChange={(e) =>
                              setGameState((prev) => ({
                                ...prev,
                                customBoss: { ...prev.customBoss, mouthSize: parseInt(e.target.value) },
                              }))
                            }
                            className="w-full"
                          />
                        </div>
                        <div>
                          <Label>嘴巴形状</Label>
                          <select
                            value={gameState.customBoss.mouthShape}
                            onChange={(e) =>
                              setGameState((prev) => ({
                                ...prev,
                                customBoss: { ...prev.customBoss, mouthShape: e.target.value as any },
                              }))
                            }
                            className="mt-1 w-full p-2 border rounded"
                          >
                            <option value="smile">微笑</option>
                            <option value="frown">皱眉</option>
                            <option value="neutral">中性</option>
                            <option value="open">张嘴</option>
                            <option value="laugh">大笑</option>
                          </select>
                        </div>
                        <div>
                          <Label>嘴巴颜色</Label>
                          <Input
                            type="color"
                            value={gameState.customBoss.mouthColor}
                            onChange={(e) =>
                              setGameState((prev) => ({
                                ...prev,
                                customBoss: { ...prev.customBoss, mouthColor: e.target.value },
                              }))
                            }
                            className="w-full mt-1"
                          />
                        </div>
                      </div>
                    </Card>

                    {/* 头发和眉毛 */}
                    <Card className="p-4">
                      <h3 className="text-lg font-bold mb-4 border-b pb-2">头发和眉毛</h3>
                      <div className="space-y-4">
                        <div>
                          <Label>发型</Label>
                          <select
                            value={gameState.customBoss.hairStyle}
                            onChange={(e) =>
                              setGameState((prev) => ({
                                ...prev,
                                customBoss: { ...prev.customBoss, hairStyle: e.target.value as any },
                              }))
                            }
                            className="mt-1 w-full p-2 border rounded"
                          >
                            <option value="none">无</option>
                            <option value="short">短发</option>
                            <option value="long">长发</option>
                            <option value="bald">秃头</option>
                            <option value="mohawk">莫西干</option>
                            <option value="curly">卷发</option>
                          </select>
                        </div>
                        <div>
                          <Label>头发颜色</Label>
                          <Input
                            type="color"
                            value={gameState.customBoss.hairColor}
                            onChange={(e) =>
                              setGameState((prev) => ({
                                ...prev,
                                customBoss: { ...prev.customBoss, hairColor: e.target.value },
                              }))
                            }
                            className="w-full mt-1"
                          />
                        </div>
                        <div>
                          <Label>眉毛粗细: {gameState.customBoss.eyebrowThickness}</Label>
                          <input
                            type="range"
                            min="1"
                            max="8"
                            value={gameState.customBoss.eyebrowThickness}
                            onChange={(e) =>
                              setGameState((prev) => ({
                                ...prev,
                                customBoss: { ...prev.customBoss, eyebrowThickness: parseInt(e.target.value) },
                              }))
                            }
                            className="w-full"
                          />
                        </div>
                        <div>
                          <Label>眉毛形状</Label>
                          <select
                            value={gameState.customBoss.eyebrowShape}
                            onChange={(e) =>
                              setGameState((prev) => ({
                                ...prev,
                                customBoss: { ...prev.customBoss, eyebrowShape: e.target.value as any },
                              }))
                            }
                            className="mt-1 w-full p-2 border rounded"
                          >
                            <option value="none">无</option>
                            <option value="straight">直眉</option>
                            <option value="arched">拱眉</option>
                            <option value="thick">粗眉</option>
                          </select>
                        </div>
                      </div>
                    </Card>

                    {/* 衣服 */}
                    <Card className="p-4">
                      <h3 className="text-lg font-bold mb-4 border-b pb-2">衣服</h3>
                      <div className="space-y-4">
                        <div>
                          <Label>上衣类型</Label>
                          <select
                            value={gameState.customBoss.topStyle}
                            onChange={(e) =>
                              setGameState((prev) => ({
                                ...prev,
                                customBoss: { ...prev.customBoss, topStyle: e.target.value as any },
                              }))
                            }
                            className="mt-1 w-full p-2 border rounded"
                          >
                            <option value="none">无</option>
                            <option value="shirt">衬衫</option>
                            <option value="tshirt">T恤</option>
                            <option value="suit">西装</option>
                            <option value="dress">连衣裙</option>
                          </select>
                        </div>
                        <div>
                          <Label>上衣颜色</Label>
                          <Input
                            type="color"
                            value={gameState.customBoss.topColor}
                            onChange={(e) =>
                              setGameState((prev) => ({
                                ...prev,
                                customBoss: { ...prev.customBoss, topColor: e.target.value },
                              }))
                            }
                            className="w-full mt-1"
                          />
                        </div>
                        <div>
                          <Label>裤子类型</Label>
                          <select
                            value={gameState.customBoss.pantsStyle}
                            onChange={(e) =>
                              setGameState((prev) => ({
                                ...prev,
                                customBoss: { ...prev.customBoss, pantsStyle: e.target.value as any },
                              }))
                            }
                            className="mt-1 w-full p-2 border rounded"
                          >
                            <option value="none">无</option>
                            <option value="jeans">牛仔裤</option>
                            <option value="pants">长裤</option>
                            <option value="shorts">短裤</option>
                            <option value="skirt">裙子</option>
                          </select>
                        </div>
                        <div>
                          <Label>裤子颜色</Label>
                          <Input
                            type="color"
                            value={gameState.customBoss.pantsColor}
                            onChange={(e) =>
                              setGameState((prev) => ({
                                ...prev,
                                customBoss: { ...prev.customBoss, pantsColor: e.target.value },
                              }))
                            }
                            className="w-full mt-1"
                          />
                        </div>
                      </div>
                    </Card>

                    {/* 鞋子和配饰 */}
                    <Card className="p-4">
                      <h3 className="text-lg font-bold mb-4 border-b pb-2">鞋子和配饰</h3>
                      <div className="space-y-4">
                        <div>
                          <Label>鞋子类型</Label>
                          <select
                            value={gameState.customBoss.shoesStyle}
                            onChange={(e) =>
                              setGameState((prev) => ({
                                ...prev,
                                customBoss: { ...prev.customBoss, shoesStyle: e.target.value as any },
                              }))
                            }
                            className="mt-1 w-full p-2 border rounded"
                          >
                            <option value="none">无</option>
                            <option value="sneakers">运动鞋</option>
                            <option value="boots">靴子</option>
                            <option value="formal">正装鞋</option>
                            <option value="barefoot">光脚</option>
                          </select>
                        </div>
                        <div>
                          <Label>鞋子颜色</Label>
                          <Input
                            type="color"
                            value={gameState.customBoss.shoesColor}
                            onChange={(e) =>
                              setGameState((prev) => ({
                                ...prev,
                                customBoss: { ...prev.customBoss, shoesColor: e.target.value },
                              }))
                            }
                            className="w-full mt-1"
                          />
                        </div>
                        <div>
                          <Label>配饰</Label>
                          <select
                            value={gameState.customBoss.accessoryStyle}
                            onChange={(e) =>
                              setGameState((prev) => ({
                                ...prev,
                                customBoss: { ...prev.customBoss, accessoryStyle: e.target.value as any },
                              }))
                            }
                            className="mt-1 w-full p-2 border rounded"
                          >
                            <option value="none">无</option>
                            <option value="glasses">眼镜</option>
                            <option value="hat">帽子</option>
                            <option value="necklace">项链</option>
                            <option value="bowtie">领结</option>
                          </select>
                        </div>
                        <div>
                          <Label>配饰颜色</Label>
                          <Input
                            type="color"
                            value={gameState.customBoss.accessoryColor}
                            onChange={(e) =>
                              setGameState((prev) => ({
                                ...prev,
                                customBoss: { ...prev.customBoss, accessoryColor: e.target.value },
                              }))
                            }
                            className="w-full mt-1"
                          />
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* 游戏界面 */}
        {gameState.screen === "game" && (
          <div className="space-y-4">
            <Card className="p-4 bg-white/95 backdrop-blur">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex gap-4 flex-wrap">
                  <div className="text-xl font-bold">
                    分数: <span className="text-blue-600">{gameState.score}</span>
                  </div>
                  <div className="text-xl font-bold">
                    连击: <span className="text-red-600">{gameState.combo}</span>
                  </div>
                  <div className="text-xl font-bold">
                    {gameState.isNoTimeLimit ? (
                      <span className="text-green-600">不记时模式</span>
                    ) : (
                      <span className="text-green-600">时间: {Math.ceil(gameState.maxTime - gameState.gameTime)}s</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={gameState.selectedSound}
                    onChange={(e) =>
                      setGameState((prev) => ({
                        ...prev,
                        selectedSound: e.target.value,
                      }))
                    }
                    className="px-3 py-2 border rounded-lg bg-white"
                  >
                    {HIT_SOUNDS.map((sound) => (
                      <option key={sound.id} value={sound.id}>
                        {sound.name}
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={() => playHitSound()}
                    variant="outline"
                    size="sm"
                  >
                    <Volume2 className="mr-1" />
                    试听
                  </Button>
                  {gameState.isNoTimeLimit && (
                    <Button
                      onClick={endGame}
                      variant="default"
                      size="sm"
                      className="bg-red-500 hover:bg-red-600"
                    >
                      结束游戏
                    </Button>
                  )}
                  <Button
                    onClick={() => {
                      setGameState((prev) => ({
                        ...prev,
                        screen: "start",
                        isPlaying: false,
                      }));
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <Home className="mr-2" />
                    返回
                  </Button>
                </div>
              </div>
            </Card>

            <Card className="p-4 bg-white/95 backdrop-blur">
              <canvas
                ref={canvasRef}
                width={800}
                height={520}
                onClick={handleCanvasClick}
                className="w-full cursor-pointer rounded-lg"
              />
              <p className="text-center text-gray-600 mt-4">
                {gameState.isNoTimeLimit ? (
                  <>
                    自由模式，想打多久就打多久！
                    {gameState.bossIsMoving ? "老板正在移动，快点抓住他！" : "老板站着不动，尽情攻击吧！"}
                    点击"结束游戏"按钮随时结算。
                  </>
                ) : (
                  <>
                    {gameState.bossIsMoving ? "老板正在移动，快点抓住他！" : "老板站着不动，尽情攻击吧！"}
                    连击越高，得分越多！
                  </>
                )}
              </p>
            </Card>
          </div>
        )}

        {/* 结束界面 */}
        {gameState.screen === "end" && (
          <div className="flex items-center justify-center min-h-[80vh]">
            <Card className="p-12 bg-white/95 backdrop-blur shadow-2xl">
              <h2 className="text-4xl font-bold text-center mb-8">游戏结束</h2>
              <div className="space-y-4 text-center">
                <p className="text-2xl">最终分数: <span className="text-blue-600 font-bold">{gameState.score}</span></p>
                <p className="text-xl">最大连击: <span className="text-red-600 font-bold">{gameState.maxCombo}</span></p>

                <div className="mt-6">
                  <Label htmlFor="player-name" className="text-lg font-semibold">
                    输入你的名字来保存成绩
                  </Label>
                  <Input
                    id="player-name"
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="输入玩家名称"
                    className="mt-2 text-lg"
                    maxLength={20}
                  />
                </div>

                <div className="flex gap-4 mt-6">
                  <Button
                    onClick={submitScore}
                    className="flex-1 h-14 text-xl rounded-full"
                  >
                    保存成绩
                  </Button>
                  <Button
                    onClick={() => startGame(gameState.bossIsMoving)}
                    variant="outline"
                    className="flex-1 h-14 text-xl rounded-full"
                  >
                    <RefreshCw className="mr-2" />
                    再来一次
                  </Button>
                </div>
                <Button
                  onClick={() => setGameState((prev) => ({ ...prev, screen: "start" }))}
                  variant="ghost"
                  className="w-full h-12 text-lg rounded-full"
                >
                  <Home className="mr-2" />
                  返回首页
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* 排行榜界面 */}
        {gameState.screen === "leaderboard" && (
          <div className="flex items-center justify-center min-h-[80vh]">
            <Card className="p-8 bg-white/95 backdrop-blur shadow-2xl w-full max-w-4xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold flex items-center">
                  <Trophy className="mr-2 text-yellow-500" />
                  全网排行榜
                </h2>
                <Button
                  onClick={() => setGameState((prev) => ({ ...prev, screen: "start" }))}
                  variant="outline"
                >
                  <Home className="mr-2" />
                  返回
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-gray-200">
                      <th className="p-4 text-left text-lg font-semibold">排名</th>
                      <th className="p-4 text-left text-lg font-semibold">玩家</th>
                      <th className="p-4 text-left text-lg font-semibold">分数</th>
                      <th className="p-4 text-left text-lg font-semibold">最大连击</th>
                      <th className="p-4 text-left text-lg font-semibold">游戏模式</th>
                      <th className="p-4 text-left text-lg font-semibold">时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.length > 0 ? (
                      leaderboard.map((record, index) => (
                        <tr key={record.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                                index === 0
                                  ? "bg-yellow-500 text-white"
                                  : index === 1
                                  ? "bg-gray-400 text-white"
                                  : index === 2
                                  ? "bg-orange-500 text-white"
                                  : "bg-gray-200"
                              }`}
                            >
                              {index + 1}
                            </span>
                          </td>
                          <td className="p-4 font-semibold">{record.playerName}</td>
                          <td className="p-4 font-bold text-blue-600">{record.score}</td>
                          <td className="p-4 font-bold text-red-600">{record.maxCombo}</td>
                          <td className="p-4">
                            <span
                              className={`px-3 py-1 rounded-full text-sm ${
                                record.gameMode === "moving"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              {record.gameMode === "moving" ? "移动模式" : "静止模式"}
                            </span>
                          </td>
                          <td className="p-4 text-gray-600">
                            {new Date(record.createdAt).toLocaleString("zh-CN")}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-500">
                          暂无排行榜数据，快来挑战吧！
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
