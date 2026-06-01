import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/appError';
import { cache } from '../lib/redis';

// Static fallbacks and metadata mapping for standard popular tokens
interface TokenStaticMeta {
    name: string;
    symbol: string;
    meta: string;
    marketCap: string;
    avatarBg: string;
    avatarText: string;
}

const STATIC_METADATA: Record<string, TokenStaticMeta> = {
    'SUI': {
        name: 'Sui',
        symbol: 'SUI',
        meta: 'SUI • Crypto • Layer 1',
        marketCap: '$3.7B MC',
        avatarBg: 'from-sui-cyan to-walrus-blue',
        avatarText: 'SUI'
    },
    'CETUS': {
        name: 'Cetus Protocol',
        symbol: 'CETUS',
        meta: 'SUI • DeFi • DEX Aggregator',
        marketCap: '$85.4M MC',
        avatarBg: 'from-indigo-600 to-purple-800',
        avatarText: '🐳'
    },
    'WAL': {
        name: 'Walrus',
        symbol: 'WAL',
        meta: 'SUI • Meme • Community Coin',
        marketCap: '$12.8M MC',
        avatarBg: 'from-emerald-500 to-teal-700',
        avatarText: 'WAL'
    },
    'BTC': {
        name: 'Bitcoin',
        symbol: 'BTC',
        meta: 'BTC • Crypto • Native Coin',
        marketCap: '$1.2T MC',
        avatarBg: 'from-amber-400 to-amber-600 bg-amber-500/10 border border-amber-500/30',
        avatarText: '₿'
    },
    'ETH': {
        name: 'Ethereum',
        symbol: 'ETH',
        meta: 'ETH • Crypto • Layer 1 Native',
        marketCap: '$420B MC',
        avatarBg: 'from-indigo-400 to-purple-600 bg-indigo-500/10 border border-indigo-500/30',
        avatarText: 'Ξ'
    },
    'BNB': {
        name: 'BNB',
        symbol: 'BNB',
        meta: 'BNB • Crypto • Smart Chain',
        marketCap: '$85B MC',
        avatarBg: 'from-yellow-400 to-amber-500 bg-yellow-500/10 border border-yellow-500/30',
        avatarText: '🔶'
    },
    'PEPE': {
        name: 'Pepe',
        symbol: 'PEPE',
        meta: 'ETH • Meme • Frog Coin',
        marketCap: '$6.2B MC',
        avatarBg: 'from-green-400 to-emerald-600 bg-green-500/10 border border-green-500/30',
        avatarText: '🐸'
    },
    'SHIB': {
        name: 'Shiba Inu',
        symbol: 'SHIB',
        meta: 'ETH • Meme • Dog Coin',
        marketCap: '$14B MC',
        avatarBg: 'from-orange-400 to-red-500 bg-orange-500/10 border border-orange-500/30',
        avatarText: '🐕'
    }
};

// Known high-liquidity pool addresses on Sui network to bypass search and prevent rate limits
const POPULAR_POOLS: Record<string, string> = {
    'SUI': '0xcf994611fd4c48e277ce3ffd4d4364c914af2c3cbb05f7bf6facd371de688630', // SUI/USDC Cetus pool
    'CETUS': '0x2e061b0ec35334de415b3c58311eb775fa05c21327f2f1118ab44d0a92d83296' // CETUS/SUI Cetus pool
};

const POPULAR_POOL_NETWORKS: Record<string, string> = {
    'SUI': 'sui-network',
    'CETUS': 'sui-network'
};

// Static mock data fallback for each token/timeframe in case GeckoTerminal is completely unreachable
const STATIC_CHART_FALLBACKS: Record<string, Record<string, number[]>> = {
    'SUI': {
        '1D': [1.32, 1.35, 1.34, 1.38, 1.42, 1.45, 1.48],
        '1W': [1.25, 1.28, 1.35, 1.32, 1.40, 1.44, 1.48],
        '1M': [1.10, 1.15, 1.22, 1.18, 1.30, 1.42, 1.48],
        '1Y': [0.45, 0.65, 0.90, 0.82, 1.15, 1.35, 1.48],
        'ALL': [0.35, 0.55, 0.85, 1.20, 1.65, 1.32, 1.48]
    },
    'CETUS': {
        '1D': [0.198, 0.194, 0.195, 0.191, 0.188, 0.186, 0.185],
        '1W': [0.175, 0.182, 0.189, 0.184, 0.192, 0.190, 0.185],
        '1M': [0.160, 0.165, 0.172, 0.168, 0.180, 0.192, 0.185],
        '1Y': [0.085, 0.115, 0.140, 0.132, 0.165, 0.178, 0.185],
        'ALL': [0.055, 0.085, 0.125, 0.150, 0.210, 0.195, 0.185]
    },
    'SNEK': {
        '1D': [0.000098, 0.000110, 0.000105, 0.000125, 0.000130, 0.000135, 0.000142],
        '1W': [0.000085, 0.000092, 0.000115, 0.000102, 0.000120, 0.000138, 0.000142],
        '1M': [0.000050, 0.000072, 0.000095, 0.000082, 0.000110, 0.000132, 0.000142],
        '1Y': [0.000012, 0.000025, 0.000045, 0.000035, 0.000080, 0.000120, 0.000142],
        'ALL': [0.000008, 0.000015, 0.000035, 0.000075, 0.000115, 0.000095, 0.000142]
    },
    'BTC': {
        '1D': [67500, 68100, 67900, 68400, 68900, 68700, 69200],
        '1W': [65000, 66200, 67400, 66800, 68100, 68900, 69200],
        '1M': [61000, 62500, 64200, 63800, 66500, 68200, 69200],
        '1Y': [32000, 41000, 52000, 48000, 62000, 67000, 69200],
        'ALL': [5000, 12000, 28000, 45000, 69000, 55000, 69200]
    },
    'ETH': {
        '1D': [3450, 3480, 3460, 3510, 3540, 3520, 3560],
        '1W': [3250, 3310, 3420, 3380, 3490, 3530, 3560],
        '1M': [2900, 3050, 3210, 3150, 3380, 3490, 3560],
        '1Y': [1850, 2100, 2450, 2320, 3100, 3420, 3560],
        'ALL': [250, 650, 1200, 2200, 4100, 3100, 3560]
    }
};

/**
 * Controller to fetch, compute, and cache ticker price chart data from GeckoTerminal
 * GET /api/tokens/:ticker/chart
 */
export const getTickerChartData = asyncHandler(async (req: Request, res: Response) => {
    const ticker = (req.params.ticker || '').toUpperCase().trim();
    const timeframe = (req.query.timeframe || '1D') as '1D' | '1W' | '1M' | '1Y' | 'ALL';

    if (!ticker) {
        throw new AppError('Ticker parameter is required', 400);
    }

    const cacheKey = `chart:v2:${ticker}:${timeframe}`;

    // 1. Try to serve from Redis Cache (5-minute TTL) to avoid hitting GeckoTerminal rate limits
    try {
        const cachedData = await cache.get(cacheKey);
        if (cachedData) {
            console.log(`⚡ Cache HIT for token chart: ${ticker}:${timeframe}`);
            return res.status(200).json(JSON.parse(cachedData));
        }
    } catch (err) {
        console.warn('⚠️ Cache fetch failed, proceeding directly:', err);
    }

    console.log(`🌐 Cache MISS. Fetching chart for cross-chain ${ticker} (${timeframe}) from GeckoTerminal...`);

    let poolAddress = POPULAR_POOLS[ticker] || null;
    let networkId = POPULAR_POOL_NETWORKS[ticker] || null;
    let dynamicMeta: TokenStaticMeta | null = STATIC_METADATA[ticker] || null;

    try {
        // 2. Resolve Pool Address & Network ID (Either from popular maps, cache, or search API)
        if (!poolAddress || !networkId) {
            const addressCacheKey = `pool:resolve:v2:${ticker}`;
            let cachedResolve = null;
            try {
                const cachedStr = await cache.get(addressCacheKey);
                if (cachedStr) {
                    cachedResolve = JSON.parse(cachedStr);
                }
            } catch (err) {
                console.warn('⚠️ Address cache read error:', err);
            }

            if (cachedResolve) {
                poolAddress = cachedResolve.poolAddress;
                networkId = cachedResolve.networkId;
                if (cachedResolve.dynamicMeta) {
                    dynamicMeta = cachedResolve.dynamicMeta;
                }
            } else {
                console.log(`🔍 Searching GeckoTerminal for top pool associated with ticker across ALL chains: ${ticker}`);
                const searchUrl = `https://api.geckoterminal.com/api/v2/search/pools?query=${encodeURIComponent(ticker)}`;
                const searchRes = await fetch(searchUrl, {
                    headers: { 'Accept': 'application/json;version=20230203' },
                    signal: AbortSignal.timeout(3500) // strict timeout
                });

                if (searchRes.ok) {
                    const searchJson: any = await searchRes.json();
                    if (searchJson.data && searchJson.data.length > 0) {
                        // Take the most liquid/active matching pool across all chains
                        const foundPool = searchJson.data[0];
                        
                        // Parse network ID prefix from pool.id (e.g. "sui-network_0x..." -> "sui-network")
                        const idParts = foundPool.id.split('_');
                        if (idParts.length >= 2) {
                            networkId = idParts[0];
                            poolAddress = idParts.slice(1).join('_');
                        } else {
                            networkId = 'eth'; // default fallback
                            poolAddress = foundPool.attributes.address;
                        }

                        // Derive premium dynamic metadata
                        if (poolAddress && networkId) {
                            // FDV formatted
                            let marketCapStr = '$2.5M MC';
                            if (foundPool.attributes.fdv_usd) {
                                const fdv = parseFloat(foundPool.attributes.fdv_usd);
                                if (fdv >= 1e9) {
                                    marketCapStr = `$${(fdv / 1e9).toFixed(1)}B FDV`;
                                } else if (fdv >= 1e6) {
                                    marketCapStr = `$${(fdv / 1e6).toFixed(1)}M FDV`;
                                } else {
                                    marketCapStr = `$${(fdv / 1e3).toFixed(1)}K FDV`;
                                }
                            } else if (foundPool.attributes.reserve_in_usd) {
                                const reserve = parseFloat(foundPool.attributes.reserve_in_usd);
                                marketCapStr = `$${(reserve / 1e6).toFixed(1)}M TVL`;
                            }

                            // Dynamic chain tag
                            const displayChain = networkId.replace('-network', '').toUpperCase();
                            const friendlyName = foundPool.attributes.name ? foundPool.attributes.name.split(' ')[0] : ticker;

                            // Dynamic neon avatar color generator based on ticker hash
                            const colors = ['amber-500', 'emerald-500', 'indigo-500', 'rose-500', 'fuchsia-500', 'teal-500', 'cyan-500'];
                            const colorIndex = Math.abs(ticker.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
                            const pickedColor = colors[colorIndex];

                            dynamicMeta = {
                                name: friendlyName,
                                symbol: ticker,
                                meta: `${displayChain} • Crypto • Cross-Chain`,
                                marketCap: marketCapStr,
                                avatarBg: `from-${pickedColor} to-walrus-blue`,
                                avatarText: ticker.slice(0, 3)
                            };

                            // Cache resolved details for 1 day
                            const resolvePayload = { poolAddress, networkId, dynamicMeta };
                            await cache.set(addressCacheKey, JSON.stringify(resolvePayload), 86400).catch(() => {});
                            console.log(`💾 Cached resolved pool address for ${ticker}: ${poolAddress} on chain ${networkId}`);
                        }
                    }
                }
            }
        }

        // 3. IF TOKEN IS NOT FOUND: Write explicit "tokenNotFound: true" message
        if (!poolAddress || !networkId) {
            console.warn(`⚠️ Token ${ticker} not found anywhere in search API. Returning No chart for this token yet.`);
            return res.status(200).json({
                status: 'success',
                tokenNotFound: true,
                message: 'No chart for this token yet'
            });
        }

        // Use resolved dynamic metadata or construct ultimate backup
        const finalMeta = dynamicMeta || STATIC_METADATA[ticker] || {
            name: ticker,
            symbol: ticker,
            meta: `MULTI • Crypto • Asset`,
            marketCap: '$2.5M MC',
            avatarBg: 'from-cyan-500 to-walrus-blue',
            avatarText: ticker.slice(0, 3)
        };

        const staticChart = STATIC_CHART_FALLBACKS[ticker] || {
            '1D': [0.38, 0.40, 0.39, 0.41, 0.43, 0.41, 0.42],
            '1W': [0.32, 0.35, 0.38, 0.37, 0.40, 0.44, 0.42],
            '1M': [0.25, 0.28, 0.32, 0.30, 0.36, 0.40, 0.42],
            '1Y': [0.08, 0.12, 0.18, 0.22, 0.30, 0.38, 0.42],
            'ALL': [0.05, 0.10, 0.15, 0.25, 0.38, 0.32, 0.42]
        };

        const fallbackPoints = staticChart[timeframe] || staticChart['1D'];
        const fallbackBasePrice = fallbackPoints[fallbackPoints.length - 1] || 0.42;

        // 4. Map Timeframe parameters for GeckoTerminal
        let gtTimeframe = 'day';
        let gtAggregate = '1';
        let limit = 30;

        if (timeframe === '1D') {
            gtTimeframe = 'minute';
            gtAggregate = '15';
            limit = 96;
        } else if (timeframe === '1W') {
            gtTimeframe = 'hour';
            gtAggregate = '4';
            limit = 42;
        } else if (timeframe === '1M') {
            gtTimeframe = 'day';
            gtAggregate = '1';
            limit = 30;
        } else if (timeframe === '1Y') {
            gtTimeframe = 'day';
            gtAggregate = '1';
            limit = 365;
        } else if (timeframe === 'ALL') {
            gtTimeframe = 'day';
            gtAggregate = '1';
            limit = 1000;
        }

        console.log(`📈 Querying OHLCV for pool ${poolAddress} on chain ${networkId} using ${gtTimeframe}...`);
        
        // 5. Fetch OHLCV candles
        const ohlcvUrl = `https://api.geckoterminal.com/api/v2/networks/${networkId}/pools/${poolAddress}/ohlcv/${gtTimeframe}?aggregate=${gtAggregate}&limit=${limit}`;
        const ohlcvRes = await fetch(ohlcvUrl, {
            headers: { 'Accept': 'application/json;version=20230203' },
            signal: AbortSignal.timeout(3500) // strict timeout
        });

        if (!ohlcvRes.ok) {
            console.warn(`⚠️ GeckoTerminal OHLCV failed (status ${ohlcvRes.status}). Serving static fallbacks.`);
            const fallbackResponse = buildFallbackResponse(finalMeta, fallbackPoints, fallbackBasePrice, timeframe);
            return res.status(200).json(fallbackResponse);
        }

        const ohlcvJson: any = await ohlcvRes.json();
        const ohlcvList = ohlcvJson.data?.attributes?.ohlcv_list;

        if (!ohlcvList || ohlcvList.length === 0) {
            console.warn(`⚠️ Empty candle data returned for pool ${poolAddress}. Serving static fallbacks.`);
            const fallbackResponse = buildFallbackResponse(finalMeta, fallbackPoints, fallbackBasePrice, timeframe);
            return res.status(200).json(fallbackResponse);
        }

        // 6. Parse candle data and sort ascending by timestamp (index 0)
        const sortedCandles = [...ohlcvList].sort((a, b) => a[0] - b[0]);
        const prices = sortedCandles.map(candle => parseFloat(candle[4])); // index 4 = close price

        const currentPrice = prices[prices.length - 1];
        const initialPrice = prices[0];
        const rawPctChange = ((currentPrice - initialPrice) / initialPrice) * 100;
        const changePct = parseFloat(rawPctChange.toFixed(2));
        const isPositive = changePct >= 0;

        const responseData = {
            status: 'success',
            tokenNotFound: false,
            data: {
                name: finalMeta.name,
                symbol: finalMeta.symbol,
                meta: finalMeta.meta,
                marketCap: finalMeta.marketCap,
                currentPrice,
                changePct,
                isPositive,
                avatarBg: finalMeta.avatarBg,
                avatarText: finalMeta.avatarText,
                timeframeValues: prices
            }
        };

        // Cache the parsed response in Redis for 5 minutes
        await cache.set(cacheKey, JSON.stringify(responseData), 300).catch(() => {});
        console.log(`💾 Cached chart data for ${ticker}:${timeframe}`);

        return res.status(200).json(responseData);

    } catch (error) {
        console.warn(`⚠️ Exception occurred while fetching GeckoTerminal data for ${ticker}:`, error);
        
        // Return fallback metadata for SUI/CETUS/BTC/ETH, else fallback
        const finalMeta = dynamicMeta || STATIC_METADATA[ticker] || {
            name: ticker,
            symbol: ticker,
            meta: `MULTI • Crypto • Asset`,
            marketCap: '$2.5M MC',
            avatarBg: 'from-cyan-500 to-walrus-blue',
            avatarText: ticker.slice(0, 3)
        };

        const staticChart = STATIC_CHART_FALLBACKS[ticker] || {
            '1D': [0.38, 0.40, 0.39, 0.41, 0.43, 0.41, 0.42],
            '1W': [0.32, 0.35, 0.38, 0.37, 0.40, 0.44, 0.42],
            '1M': [0.25, 0.28, 0.32, 0.30, 0.36, 0.40, 0.42],
            '1Y': [0.08, 0.12, 0.18, 0.22, 0.30, 0.38, 0.42],
            'ALL': [0.05, 0.10, 0.15, 0.25, 0.38, 0.32, 0.42]
        };
        const fallbackPoints = staticChart[timeframe] || staticChart['1D'];
        const fallbackBasePrice = fallbackPoints[fallbackPoints.length - 1] || 0.42;

        const fallbackResponse = buildFallbackResponse(finalMeta, fallbackPoints, fallbackBasePrice, timeframe);
        return res.status(200).json(fallbackResponse);
    }
});

// Helper function to build a structured fallback response
function buildFallbackResponse(
    meta: TokenStaticMeta,
    fallbackPoints: number[],
    fallbackBasePrice: number,
    timeframe: string
) {
    const currentPrice = fallbackPoints[fallbackPoints.length - 1] || fallbackBasePrice;
    const initialPrice = fallbackPoints[0] || fallbackBasePrice;
    const rawPctChange = ((currentPrice - initialPrice) / initialPrice) * 100;
    const changePct = parseFloat(rawPctChange.toFixed(2));
    const isPositive = changePct >= 0;

    return {
        status: 'success',
        tokenNotFound: false,
        isFallback: true,
        data: {
            name: meta.name,
            symbol: meta.symbol,
            meta: meta.meta,
            marketCap: meta.marketCap,
            currentPrice,
            changePct,
            isPositive,
            avatarBg: meta.avatarBg,
            avatarText: meta.avatarText,
            timeframeValues: fallbackPoints
        }
    };
}
