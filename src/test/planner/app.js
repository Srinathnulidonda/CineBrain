// ================================
// DATA
// ================================
const cinebrain30Days = [
    {
        day: 1,
        weekday: "Monday",
        posts: [
            {
                time: "8:15 PM",
                template: "movie recommendation",
                title: "Shutter Island",
                year: 2010,
                hook: "This movie breaks your mind quietly — and most people never notice how.",
                overview: "A psychological descent into guilt, memory, and denial.\nEvery scene means something else once you reach the end.",
                hashtags: ["#MovieRecommendation", "#PsychologicalThriller", "#MindGames", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "mind bending",
                title: "Enemy",
                year: 2013,
                hook: "Nobody explains this movie — because it explains you.",
                overview: "A haunting exploration of identity and suppressed fear.\nMinimal dialogue. Maximum unease.",
                hashtags: ["#MindBending", "#HiddenMeaning", "#PsychologicalCinema", "#CineBrain"]
            }
        ]
    },
    {
        day: 2,
        weekday: "Tuesday",
        posts: [
            {
                time: "8:15 PM",
                template: "hidden gem",
                title: "Coherence",
                year: 2013,
                hook: "One dinner. One comet. Infinite realities.",
                overview: "A low-budget sci-fi that proves ideas matter more than effects.\nGets scarier the more you think about it.",
                hashtags: ["#HiddenGem", "#SciFiThriller", "#UnderratedMovies", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "anime gem",
                title: "Perfect Blue",
                year: 1997,
                hook: "This anime destroys the line between reality and obsession.",
                overview: "A psychological nightmare about fame, identity, and mental collapse.",
                hashtags: ["#AnimeGem", "#PsychologicalAnime", "#CultClassic", "#CineBrain"]
            }
        ]
    },
    {
        day: 3,
        weekday: "Wednesday",
        posts: [
            {
                time: "8:15 PM",
                template: "tv show recommendation",
                title: "Dark",
                platform: "Netflix",
                hook: "The most confusing show ever — and that's why it's brilliant.",
                overview: "Time, fate, family, and consequences collide.\nMiss one detail and everything changes.",
                hashtags: ["#TVShowRecommendation", "#DarkNetflix", "#MindBendingSeries", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "anime recommendation",
                title: "Steins;Gate",
                hook: "Time travel with emotional consequences — not superhero nonsense.",
                overview: "A slow burn that rewards patience with heartbreak and brilliance.",
                hashtags: ["#AnimeRecommendation", "#TimeTravel", "#SciFiAnime", "#CineBrain"]
            }
        ]
    },
    {
        day: 4,
        weekday: "Thursday",
        posts: [
            {
                time: "8:15 PM",
                template: "movie recommendation",
                title: "Arrival",
                year: 2016,
                hook: "This sci-fi movie makes you rethink time, language, and grief.",
                overview: "A deeply emotional take on first contact.\nScience fiction as human experience.",
                hashtags: ["#SciFiMovies", "#Arrival", "#EmotionalCinema", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "hidden gem",
                title: "Moon",
                year: 2009,
                hook: "One actor. One location. One terrifying idea.",
                overview: "Isolation, identity, and corporate cruelty in space.",
                hashtags: ["#HiddenGem", "#SciFiDrama", "#UnderratedCinema", "#CineBrain"]
            }
        ]
    },
    {
        day: 5,
        weekday: "Friday",
        posts: [
            {
                time: "8:15 PM",
                template: "top list/curation",
                listTitle: "Top 5 Mind-Bending Sci-Fi Gems",
                items: [
                    "Coherence (2013) – Parallel chaos",
                    "Primer (2004) – Time for engineers",
                    "Enemy (2013) – Identity horror",
                    "Moon (2009) – Isolation in space",
                    "Annihilation (2018) – Self-destruction"
                ],
                hashtags: ["#Top5Movies", "#MindBending", "#SciFiGems", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "mind bending",
                title: "Mulholland Drive",
                year: 2001,
                hook: "This movie doesn't want to be understood — it wants to be felt.",
                overview: "Dream logic, identity loss, and Hollywood illusion.",
                hashtags: ["#MindBending", "#DavidLynch", "#CultCinema", "#CineBrain"]
            }
        ]
    },
    {
        day: 6,
        weekday: "Saturday",
        posts: [
            {
                time: "8:15 PM",
                template: "movie recommendation",
                region: "Telugu",
                title: "C/o Kancharapalem",
                hook: "No heroes. No villains. Just real people.",
                overview: "Love, caste, age, and humanity told with honesty.",
                hashtags: ["#TeluguCinema", "#IndianFilms", "#UnderratedTelugu", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "anime gem",
                title: "Serial Experiments Lain",
                hook: "This anime predicted the internet — and its loneliness.",
                overview: "Identity dissolves in the digital age.",
                hashtags: ["#AnimeGem", "#CyberpunkAnime", "#PsychologicalAnime", "#CineBrain"]
            }
        ]
    },
    {
        day: 7,
        weekday: "Sunday",
        posts: [
            {
                time: "8:15 PM",
                template: "movie recommendation",
                title: "Interstellar",
                hook: "Love, time, and space collide here.",
                overview: "Science fiction with emotional weight and philosophical depth.",
                hashtags: ["#MovieRecommendation", "#Interstellar", "#SciFiEpic", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "tv show recommendation",
                title: "True Detective",
                season: 1,
                hook: "Not a crime show — a philosophical descent.",
                overview: "Existential dread wrapped in a murder mystery.",
                hashtags: ["#TVShowRecommendation", "#TrueDetective", "#DarkDrama", "#CineBrain"]
            }
        ]
    },
    {
        day: 8,
        weekday: "Monday",
        posts: [
            {
                time: "8:15 PM",
                template: "movie recommendation",
                title: "Ex Machina",
                year: 2014,
                hook: "This movie asks one terrifying question: what makes us human?",
                overview: "Artificial intelligence as manipulation, desire, and control.\nA quiet psychological duel.",
                hashtags: ["#MovieRecommendation", "#SciFiThriller", "#ExMachina", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "mind bending",
                title: "Primer",
                year: 2004,
                hook: "The smartest time-travel movie most people quit halfway.",
                overview: "No hand-holding. No explanations.\nOnly consequences.",
                hashtags: ["#MindBending", "#TimeTravel", "#CultCinema", "#CineBrain"]
            }
        ]
    },
    {
        day: 9,
        weekday: "Tuesday",
        posts: [
            {
                time: "8:15 PM",
                template: "hidden gem",
                title: "The Man from Earth",
                year: 2007,
                hook: "One room. One conversation. Endless ideas.",
                overview: "Immortality, history, and belief discussed without spectacle.",
                hashtags: ["#HiddenGem", "#PhilosophicalCinema", "#CultFilm", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "anime gem",
                title: "Paranoia Agent",
                year: 2004,
                hook: "This anime exposes fear the way horror never could.",
                overview: "Collective anxiety and social pressure take form.",
                hashtags: ["#AnimeGem", "#PsychologicalAnime", "#CultClassic", "#CineBrain"]
            }
        ]
    },
    {
        day: 10,
        weekday: "Wednesday",
        posts: [
            {
                time: "8:15 PM",
                template: "tv show recommendation",
                title: "Severance",
                hook: "What if work and life were completely separated?",
                overview: "Corporate control taken to its logical extreme.",
                hashtags: ["#TVShowRecommendation", "#Severance", "#PsychologicalDrama", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "anime recommendation",
                title: "Ergo Proxy",
                hook: "Philosophy disguised as a dystopian anime.",
                overview: "Identity, AI, and existential collapse.",
                hashtags: ["#AnimeRecommendation", "#CyberpunkAnime", "#CineBrain"]
            }
        ]
    },
    {
        day: 11,
        weekday: "Thursday",
        posts: [
            {
                time: "8:15 PM",
                template: "movie recommendation",
                title: "Her",
                year: 2013,
                hook: "A love story that feels uncomfortably real.",
                overview: "Loneliness, technology, and emotional dependence.",
                hashtags: ["#MovieRecommendation", "#EmotionalCinema", "#HerMovie", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "hidden gem",
                title: "A Ghost Story",
                year: 2017,
                hook: "Time passes. Pain remains.",
                overview: "Grief told through silence and stillness.",
                hashtags: ["#HiddenGem", "#ExperimentalCinema", "#CineBrain"]
            }
        ]
    },
    {
        day: 12,
        weekday: "Friday",
        posts: [
            {
                time: "8:15 PM",
                template: "top list/curation",
                listTitle: "Top 5 Psychological Movies That Break You Slowly",
                items: [
                    "Black Swan (2010) – Obsession",
                    "Requiem for a Dream (2000) – Addiction",
                    "Perfect Blue (1997) – Identity",
                    "Enemy (2013) – Duality",
                    "Shutter Island (2010) – Denial"
                ],
                hashtags: ["#Top5Movies", "#PsychologicalCinema", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "mind bending",
                title: "The Lighthouse",
                year: 2019,
                hook: "Madness tastes like salt and sea.",
                overview: "Isolation, myth, and psychological decay.",
                hashtags: ["#MindBending", "#PsychologicalHorror", "#CineBrain"]
            }
        ]
    },
    {
        day: 13,
        weekday: "Saturday",
        posts: [
            {
                time: "8:15 PM",
                template: "movie recommendation",
                region: "Telugu",
                title: "Agent Sai Srinivasa Athreya",
                hook: "A detective story that respects your intelligence.",
                overview: "Smart writing, humor, and genuine mystery.",
                hashtags: ["#TeluguCinema", "#IndianMystery", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "anime gem",
                title: "Monster",
                hook: "This anime proves villains are made, not born.",
                overview: "Slow, intense, deeply human storytelling.",
                hashtags: ["#AnimeGem", "#PsychologicalDrama", "#CineBrain"]
            }
        ]
    },
    {
        day: 14,
        weekday: "Sunday",
        posts: [
            {
                time: "8:15 PM",
                template: "movie recommendation",
                title: "Blade Runner 2049",
                hook: "What does it mean to be real?",
                overview: "Identity, memory, and solitude in a neon future.",
                hashtags: ["#MovieRecommendation", "#BladeRunner2049", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "tv show recommendation",
                title: "The Leftovers",
                hook: "Not about disappearance — about grief.",
                overview: "Faith, loss, and unanswered questions.",
                hashtags: ["#TVShowRecommendation", "#TheLeftovers", "#CineBrain"]
            }
        ]
    },
    {
        day: 15,
        weekday: "Monday",
        posts: [
            {
                time: "8:15 PM",
                template: "movie recommendation",
                title: "Donnie Darko",
                year: 2001,
                hook: "This movie stays with you longer than the ending.",
                overview: "Time loops, mental health, and destiny collide.\nConfusing at first. Haunting forever.",
                hashtags: ["#MovieRecommendation", "#CultClassic", "#MindGames", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "mind bending",
                title: "Synecdoche, New York",
                year: 2008,
                hook: "This isn't a movie — it's a slow collapse.",
                overview: "Life, art, death, and meaning folding into one.",
                hashtags: ["#MindBending", "#ExistentialCinema", "#CineBrain"]
            }
        ]
    },
    {
        day: 16,
        weekday: "Tuesday",
        posts: [
            {
                time: "8:15 PM",
                template: "hidden gem",
                title: "The Vast of Night",
                year: 2019,
                hook: "Retro sci-fi with incredible atmosphere.",
                overview: "Late-night radio, paranoia, and curiosity.",
                hashtags: ["#HiddenGem", "#IndieSciFi", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "anime gem",
                title: "Texhnolyze",
                year: 2003,
                hook: "This anime is silence, violence, and despair.",
                overview: "A brutal vision of humanity's collapse.",
                hashtags: ["#AnimeGem", "#DarkAnime", "#PhilosophicalAnime", "#CineBrain"]
            }
        ]
    },
    {
        day: 17,
        weekday: "Wednesday",
        posts: [
            {
                time: "8:15 PM",
                template: "tv show recommendation",
                title: "Mr. Robot",
                hook: "Reality lies to you in this show.",
                overview: "Hacking, identity, and psychological trauma.",
                hashtags: ["#TVShowRecommendation", "#MrRobot", "#MindGames", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "anime recommendation",
                title: "Death Parade",
                hook: "Judgment after death — with no mercy.",
                overview: "Morality tested through deadly games.",
                hashtags: ["#AnimeRecommendation", "#PsychologicalAnime", "#CineBrain"]
            }
        ]
    },
    {
        day: 18,
        weekday: "Thursday",
        posts: [
            {
                time: "8:15 PM",
                template: "movie recommendation",
                title: "The Prestige",
                year: 2006,
                hook: "The real trick is what you don't see.",
                overview: "Obsession, sacrifice, and illusion.",
                hashtags: ["#MovieRecommendation", "#ChristopherNolan", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "hidden gem",
                title: "Upstream Color",
                year: 2013,
                hook: "This movie feels like a dream you can't explain.",
                overview: "Identity, control, and emotional residue.",
                hashtags: ["#HiddenGem", "#ExperimentalCinema", "#CineBrain"]
            }
        ]
    },
    {
        day: 19,
        weekday: "Friday",
        posts: [
            {
                time: "8:15 PM",
                template: "top list/curation",
                listTitle: "Top 5 Movies About Identity Loss",
                items: [
                    "Enemy (2013) – Dual selves",
                    "Black Swan (2010) – Obsession",
                    "Perfect Blue (1997) – Fame",
                    "Fight Club (1999) – Split identity",
                    "Mulholland Drive (2001) – Dreams"
                ],
                hashtags: ["#Top5Movies", "#PsychologicalCinema", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "mind bending",
                title: "The Killing of a Sacred Deer",
                year: 2017,
                hook: "Cold, cruel, and deeply unsettling.",
                overview: "Moral punishment without mercy.",
                hashtags: ["#MindBending", "#PsychologicalDrama", "#CineBrain"]
            }
        ]
    },
    {
        day: 20,
        weekday: "Saturday",
        posts: [
            {
                time: "8:15 PM",
                template: "movie recommendation",
                region: "Telugu",
                title: "Prasthanam",
                year: 2010,
                hook: "Power always demands blood.",
                overview: "Politics, family, and fate collide.",
                hashtags: ["#TeluguCinema", "#IndianFilms", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "anime gem",
                title: "Kaiba",
                year: 2008,
                hook: "Cute art. Crushing ideas.",
                overview: "Memory, bodies, and inequality.",
                hashtags: ["#AnimeGem", "#PhilosophicalAnime", "#CineBrain"]
            }
        ]
    },
    {
        day: 21,
        weekday: "Sunday",
        posts: [
            {
                time: "8:15 PM",
                template: "movie recommendation",
                title: "Memories of Murder",
                year: 2003,
                hook: "Not every mystery wants to be solved.",
                overview: "Crime, failure, and human limits.",
                hashtags: ["#MovieRecommendation", "#KoreanCinema", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "tv show recommendation",
                title: "Westworld",
                season: 1,
                hook: "Free will was never really free.",
                overview: "Consciousness trapped in loops.",
                hashtags: ["#TVShowRecommendation", "#Westworld", "#CineBrain"]
            }
        ]
    },
    {
        day: 22,
        weekday: "Monday",
        posts: [
            {
                time: "8:15 PM",
                template: "movie recommendation",
                title: "Solaris",
                year: 1972,
                hook: "Science fiction about memory and love.",
                overview: "A slow, philosophical meditation on loss.",
                hashtags: ["#MovieRecommendation", "#PhilosophicalCinema", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "mind bending",
                title: "Stalker",
                year: 1979,
                hook: "This movie tests your patience — and your soul.",
                overview: "Faith, desire, and meaning.",
                hashtags: ["#MindBending", "#ArtCinema", "#CineBrain"]
            }
        ]
    },
    {
        day: 23,
        weekday: "Tuesday",
        posts: [
            {
                time: "8:15 PM",
                template: "hidden gem",
                title: "The Invitation",
                year: 2015,
                hook: "Grief makes people dangerous.",
                overview: "Slow tension with explosive payoff.",
                hashtags: ["#HiddenGem", "#PsychologicalThriller", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "anime gem",
                title: "Angel's Egg",
                year: 1985,
                hook: "Pure symbolism. No explanations.",
                overview: "Faith, innocence, and silence.",
                hashtags: ["#AnimeGem", "#ExperimentalAnime", "#CineBrain"]
            }
        ]
    },
    {
        day: 24,
        weekday: "Wednesday",
        posts: [
            {
                time: "8:15 PM",
                template: "tv show recommendation",
                title: "Black Mirror",
                hook: "Technology always comes with a price.",
                overview: "Human nature under digital pressure.",
                hashtags: ["#TVShowRecommendation", "#BlackMirror", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "anime recommendation",
                title: "Paprika",
                year: 2006,
                hook: "Dreams invading reality.",
                overview: "A visual explosion of the subconscious.",
                hashtags: ["#AnimeRecommendation", "#MindBendingAnime", "#CineBrain"]
            }
        ]
    },
    {
        day: 25,
        weekday: "Thursday",
        posts: [
            {
                time: "8:15 PM",
                template: "movie recommendation",
                title: "No Country for Old Men",
                year: 2007,
                hook: "Evil doesn't explain itself.",
                overview: "Violence, fate, and silence.",
                hashtags: ["#MovieRecommendation", "#ModernClassic", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "hidden gem",
                title: "Burning",
                year: 2018,
                hook: "A slow burn that never leaves you.",
                overview: "Jealousy, class, and ambiguity.",
                hashtags: ["#HiddenGem", "#KoreanCinema", "#CineBrain"]
            }
        ]
    },
    {
        day: 26,
        weekday: "Friday",
        posts: [
            {
                time: "8:15 PM",
                template: "top list/curation",
                listTitle: "Top 5 Movies That Feel Like Nightmares",
                items: [
                    "The Lighthouse (2019)",
                    "Enemy (2013)",
                    "Perfect Blue (1997)",
                    "Eraserhead (1977)",
                    "The Killing of a Sacred Deer (2017)"
                ],
                hashtags: ["#Top5Movies", "#DarkCinema", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "mind bending",
                title: "Eraserhead",
                year: 1977,
                hook: "Pure anxiety on film.",
                overview: "Industrial nightmares and fear.",
                hashtags: ["#MindBending", "#DavidLynch", "#CineBrain"]
            }
        ]
    },
    {
        day: 27,
        weekday: "Saturday",
        posts: [
            {
                time: "8:15 PM",
                template: "movie recommendation",
                region: "Telugu",
                title: "Anukokunda Oka Roju",
                year: 2005,
                hook: "Memory loss becomes a mystery.",
                overview: "Tension-driven storytelling.",
                hashtags: ["#TeluguCinema", "#IndianThriller", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "anime gem",
                title: "Haibane Renmei",
                year: 2002,
                hook: "Quiet, sad, and deeply healing.",
                overview: "Guilt, rebirth, and acceptance.",
                hashtags: ["#AnimeGem", "#PhilosophicalAnime", "#CineBrain"]
            }
        ]
    },
    {
        day: 28,
        weekday: "Sunday",
        posts: [
            {
                time: "8:15 PM",
                template: "movie recommendation",
                title: "Oldboy",
                year: 2003,
                hook: "Revenge never ends cleanly.",
                overview: "Pain, memory, and punishment.",
                hashtags: ["#MovieRecommendation", "#KoreanCinema", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "tv show recommendation",
                title: "Dark",
                note: "Rewatch recommendation",
                hook: "Watch again. Notice everything.",
                overview: "Details you missed the first time.",
                hashtags: ["#TVShowRecommendation", "#DarkNetflix", "#CineBrain"]
            }
        ]
    },
    {
        day: 29,
        weekday: "Monday",
        posts: [
            {
                time: "8:15 PM",
                template: "movie recommendation",
                title: "Joker",
                year: 2019,
                hook: "Society creates its own monsters.",
                overview: "Loneliness, rage, and neglect.",
                hashtags: ["#MovieRecommendation", "#PsychologicalDrama", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "mind bending",
                title: "Enemy",
                note: "Revisit",
                hook: "Watch it again. It hits harder.",
                overview: "Symbolism reveals itself slowly.",
                hashtags: ["#MindBending", "#Rewatch", "#CineBrain"]
            }
        ]
    },
    {
        day: 30,
        weekday: "Tuesday",
        posts: [
            {
                time: "8:15 PM",
                template: "movie recommendation",
                title: "Fight Club",
                year: 1999,
                hook: "You are not your job.",
                overview: "Identity, masculinity, and rebellion.",
                hashtags: ["#MovieRecommendation", "#CultClassic", "#CineBrain"]
            },
            {
                time: "11:45 PM",
                template: "top list/curation",
                listTitle: "Top 10 Movies That Define CineBrain",
                items: [
                    "Shutter Island",
                    "Enemy",
                    "Coherence",
                    "Arrival",
                    "Mulholland Drive",
                    "Perfect Blue",
                    "Donnie Darko",
                    "Blade Runner 2049",
                    "Stalker",
                    "Memories of Murder"
                ],
                hashtags: ["#CineBrain", "#FilmCuration", "#CinemaLovers"]
            }
        ]
    }
];

// ================================
// STATE
// ================================
let completedPosts = JSON.parse(localStorage.getItem('cinebrain_completed') || '{}');
let currentView = 'list';
let currentSection = 'home';

// ================================
// INITIALIZATION
// ================================
document.addEventListener('DOMContentLoaded', () => {
    hideLoading();
    renderDayNavigator();
    renderDays();
    updateProgress();
    setupEventListeners();
    updateTodayBanner();
    setupScrollListener();
});

// ================================
// EVENT LISTENERS
// ================================
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', debounce(handleSearch, 300));

    // Filters
    document.getElementById('templateFilter').addEventListener('change', filterDays);
    document.getElementById('statusFilter').addEventListener('change', filterDays);

    // Close modals on overlay click
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });

    // Handle escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeAllModals();
            closeSidebar();
        }
    });
}

function setupScrollListener() {
    const scrollBtn = document.getElementById('scrollTopBtn');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 500) {
            scrollBtn.classList.add('visible');
        } else {
            scrollBtn.classList.remove('visible');
        }

        lastScroll = currentScroll;
    }, { passive: true });
}

// ================================
// UTILITY FUNCTIONS
// ================================
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function showLoading() {
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

// ================================
// SIDEBAR FUNCTIONS
// ================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
    document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
}

// ================================
// NAVIGATION
// ================================
function showSection(section) {
    currentSection = section;

    // Update mobile nav
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.currentTarget.classList.add('active');

    if (section === 'stats') {
        showStatsModal();
    } else if (section === 'days') {
        scrollToToday();
    }
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function scrollToDay(dayNum) {
    closeSidebar();

    if (currentView === 'calendar') {
        setView('list');
        setTimeout(() => {
            const element = document.getElementById(`day-${dayNum}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    } else {
        const element = document.getElementById(`day-${dayNum}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

function scrollToToday() {
    for (const day of cinebrain30Days) {
        if (!isDayCompleted(day.day)) {
            scrollToDay(day.day);
            return;
        }
    }
    scrollToDay(1);
}

// ================================
// RENDER FUNCTIONS
// ================================
function renderDayNavigator() {
    const container = document.getElementById('dayNavigator');
    container.innerHTML = cinebrain30Days.map(day => {
        const dayCompleted = isDayCompleted(day.day);
        const dayPartial = isDayPartial(day.day);
        const status = dayCompleted ? '✅' : (dayPartial ? '🔶' : '⬜');
        const statusClass = dayCompleted ? 'completed' : '';

        return `
            <button class="day-nav-item ${statusClass}" onclick="scrollToDay(${day.day})">
                <div class="day-nav-info">
                    <span class="day-nav-number">Day ${day.day}</span>
                    <span class="day-nav-weekday">${day.weekday}</span>
                </div>
                <span class="day-nav-status">${status}</span>
            </button>
        `;
    }).join('');
}

function renderDays() {
    const container = document.getElementById('daysContainer');

    if (currentView === 'calendar') {
        renderCalendarView(container);
        return;
    }

    container.innerHTML = cinebrain30Days.map(day => {
        const dayCompleted = isDayCompleted(day.day);
        const dayPartial = isDayPartial(day.day);
        const statusClass = dayCompleted ? 'completed' : (dayPartial ? 'partial' : 'pending');
        const statusText = dayCompleted ? '✅ Done' : (dayPartial ? '🔶 Progress' : '⬜ Pending');

        return `
            <div class="day-card fade-in" id="day-${day.day}">
                <div class="day-header">
                    <div class="day-info">
                        <div class="day-number">
                            <span>Day</span>
                            <span>${day.day}</span>
                        </div>
                        <div class="day-meta">
                            <h2>${day.weekday}</h2>
                            <span>${day.posts.length} posts</span>
                        </div>
                    </div>
                    <div class="day-status ${statusClass}">
                        ${statusText}
                    </div>
                </div>
                <div class="posts-container">
                    ${day.posts.map((post, index) => renderPost(day.day, post, index)).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function renderPost(dayNum, post, index) {
    const postId = `${dayNum}-${index}`;
    const isCompleted = completedPosts[postId] || false;
    const completedClass = isCompleted ? 'completed' : '';

    let contentHtml = '';

    if (post.listTitle) {
        contentHtml = `
            <div class="post-list">
                <div class="post-list-title">${post.listTitle}</div>
                <ul>
                    ${post.items.map(item => `<li>${item}</li>`).join('')}
                </ul>
            </div>
        `;
    } else {
        contentHtml = `
            <div class="post-title">
                ${post.title}
                ${post.year ? `<span class="post-year">(${post.year})</span>` : ''}
                ${post.region ? `<span class="post-region">${post.region}</span>` : ''}
                ${post.season ? `<span class="post-year">S${post.season}</span>` : ''}
            </div>
            ${post.hook ? `<div class="post-hook">"${post.hook}"</div>` : ''}
            ${post.overview ? `<div class="post-overview">${post.overview}</div>` : ''}
        `;
    }

    return `
        <div class="post-card ${completedClass}">
            <div class="post-header">
                <div class="post-time-template">
                    <span class="post-time">🕐 ${post.time}</span>
                    <span class="post-template">${post.template}</span>
                    ${post.platform ? `<span class="post-template" style="background: var(--danger)">${post.platform}</span>` : ''}
                </div>
                <input type="checkbox" class="post-checkbox" 
                    ${isCompleted ? 'checked' : ''} 
                    onchange="togglePost('${postId}', this.checked)"
                    aria-label="Mark post as complete">
            </div>
            <div class="post-content">
                ${contentHtml}
                ${post.note ? `<div class="post-note">📌 ${post.note}</div>` : ''}
            </div>
            <div class="post-hashtags">
                ${post.hashtags.map(tag => `<span class="hashtag">${tag}</span>`).join('')}
            </div>
        </div>
    `;
}

function renderCalendarView(container) {
    container.innerHTML = `
        <div class="calendar-view">
            ${cinebrain30Days.map(day => {
        const dayCompleted = isDayCompleted(day.day);
        const dayPartial = isDayPartial(day.day);
        const statusClass = dayCompleted ? 'completed' : (dayPartial ? 'partial' : '');

        return `
                    <div class="calendar-day ${statusClass}" onclick="showDayModal(${day.day})">
                        <span class="calendar-day-number">${day.day}</span>
                        <span class="calendar-day-label">${day.weekday.substring(0, 3)}</span>
                    </div>
                `;
    }).join('')}
        </div>
    `;
}

// ================================
// POST MANAGEMENT
// ================================
function togglePost(postId, isCompleted) {
    completedPosts[postId] = isCompleted;
    localStorage.setItem('cinebrain_completed', JSON.stringify(completedPosts));

    updateProgress();
    renderDayNavigator();
    updateDayStatus(postId);
    updateTodayBanner();

    showToast(isCompleted ? '✅ Post completed!' : '↩️ Post unchecked', isCompleted ? 'success' : '');
}

function updateDayStatus(postId) {
    const [dayNum] = postId.split('-');
    const dayCard = document.getElementById(`day-${dayNum}`);
    if (dayCard) {
        const dayCompleted = isDayCompleted(parseInt(dayNum));
        const dayPartial = isDayPartial(parseInt(dayNum));
        const statusEl = dayCard.querySelector('.day-status');

        statusEl.className = `day-status ${dayCompleted ? 'completed' : (dayPartial ? 'partial' : 'pending')}`;
        statusEl.innerHTML = dayCompleted ? '✅ Done' : (dayPartial ? '🔶 Progress' : '⬜ Pending');
    }
}

function isDayCompleted(dayNum) {
    const day = cinebrain30Days.find(d => d.day === dayNum);
    if (!day) return false;
    return day.posts.every((_, index) => completedPosts[`${dayNum}-${index}`]);
}

function isDayPartial(dayNum) {
    const day = cinebrain30Days.find(d => d.day === dayNum);
    if (!day) return false;
    const completed = day.posts.filter((_, index) => 