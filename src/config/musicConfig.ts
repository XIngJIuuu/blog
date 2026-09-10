import type { MusicPlayerConfig } from "../types/musicConfig";

// 音乐播放器配置
export const musicPlayerConfig: MusicPlayerConfig = {
	// 是否在导航栏显示音乐播放器入口
	showInNavbar: true,

	// 是否在侧边栏显示音乐播放器组件
	showInSidebar: true,

	// 使用方式："meting" 使用 Meting API，"local" 使用本地音乐列表
	mode: "local",

	// 默认音量 (0-1)
	volume: 0.7,

	// 播放模式：'list'=列表循环, 'one'=单曲循环, 'random'=随机播放
	playMode: "random",

	// 两首背景音乐都没有歌词文件，关闭歌词面板
	showLyrics: false,

	// 本地背景音乐配置（当 mode 为 'local' 时使用）
	// 音频文件放在 public/assets/music 下，随机播放这两首
	// 1. 支持传入歌词文件的路径
	// lrc: "/assets/music/lrc/xxx.lrc",
	// 2. 或者直接填入歌词字符串内容
	// lrc: "[00:00.00]歌词内容...",
	local: {
		playlist: [
			{
				name: "Travelers",
				artist: "Andrew Prahlow",
				url: "/assets/music/Travelers-Andrew-Prahlow.mp3",
				cover: "/assets/music/cover/travelers.jpg",
				lrc: "",
			},
			{
				name: "NIGHT DANCER",
				artist: "imase",
				url: "/assets/music/NIGHT-DANCER-imase.mp3",
				cover: "/assets/music/cover/night-dancer.jpg",
				lrc: "",
			},
		],
	},
};
