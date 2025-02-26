<?php /** @noinspection PhpExpressionResultUnusedInspection */
/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * ZeroDown implementation : © Oliver THEBAULT (a.k.a. Oliboy50)
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * Game.php
 *
 * This is the main file for your game logic.
 *
 * In this PHP file, you are going to defines the rules of the game.
 */
declare(strict_types=1);

namespace Bga\Games\ZeroDown;

require_once(APP_GAMEMODULE_PATH . 'module/table/table.game.php');

class Game extends \Table
{
    private const NUMBER_OF_CARDS_TO_DEAL_TO_EACH_PLAYER = 9;
    private const NUMBER_OF_CARDS_TO_DEAL_ON_THE_TABLE = 5;
    private const NUMBER_OF_CARDS_TO_DEAL_ON_THE_TABLE_IN_2_PLAYERS_MODE = 9;
    private const NUMBER_OF_CARDS_OF_SAME_TYPE_THAT_PRODUCE_0 = 5;

    private const GAME_STATE_CURRENT_ROUND = 'currentRound';
    private const GAME_STATE_HOW_MANY_KNOCKING = 'howManyKnockings';
    private const GAME_STATE_SECOND_KNOCKING_PLAYER_ID = 'secondKnockingPlayerId';

    private const GAME_OPTION_HOW_MANY_ROUNDS = 100;

    private const CARD_LOCATION_DECK = 'deck';
    private const CARD_LOCATION_PLAYER_HAND = 'hand';
    private const CARD_LOCATION_TABLE = 'table';

    /** @var mixed Deck (BGA framework component to manage cards) */
    private $deck;

    /**
     * Your global variables labels:
     *
     * Here, you can assign labels to global variables you are using for this game. You can use any number of global
     * variables with IDs between 10 and 99. If your game has options (variants), you also have to associate here a
     * label to the corresponding ID in `gameoptions.inc.php`.
     *
     * NOTE: afterward, you can get/set the global variables with `getGameStateValue`, `setGameStateInitialValue` or
     * `setGameStateValue` functions.
     */
    public function __construct()
    {
        parent::__construct();

        // Your global variables labels:
        //  Here, you can assign labels to global variables you are using for this game.
        //  You can use any number of global variables with IDs between 10 and 99.
        //  If your game has options (variants), you also have to associate here a label to
        //  the corresponding ID in gameoptions.json.
        // Note: afterwards, you can get/set the global variables with getGameStateValue/setGameStateInitialValue/setGameStateValue
        $this->initGameStateLabels([
            self::GAME_STATE_CURRENT_ROUND => 10,
            self::GAME_STATE_HOW_MANY_KNOCKING => 20,
            self::GAME_STATE_SECOND_KNOCKING_PLAYER_ID => 22,
        ]);

        $this->deck = $this->getNew('module.common.deck');
        $this->deck->init('card');
    }

    protected function getGameName()
    {
        return 'zerodown';
    }

    protected function setupNewGame($players, $options = [])
    {
        // Set the colors of the players with HTML color code
        // The default below is red/green/blue/yellow
        // The number of colors defined here must correspond to the maximum number of players allowed for the gams
        $gameinfos = $this->getGameinfos();
        $default_colors = $gameinfos['player_colors'];

        // Create players
        // Note: if you added some extra field on "player" table in the database (dbmodel.sql), you can initialized it there.
        $sql = 'INSERT INTO player (player_id, player_color, player_canal, player_name, player_avatar) VALUES ';
        $values = [];
        foreach ($players as $player_id => $player) {
            $color = array_shift($default_colors);
            $values[] = "('".$player_id."','$color','".$player['player_canal']."','".addslashes($player['player_name'])."','".addslashes($player['player_avatar'])."')";
        }
        $sql .= implode(',', $values);
        $this->DbQuery($sql);
        $this->reattributeColorsBasedOnPreferences($players, $gameinfos['player_colors']);
        $this->reloadPlayersBasicInfos();

        /************ Start the game initialization *****/

        // Init global values with their initial values
        $this->setGameStateValue(self::GAME_STATE_CURRENT_ROUND, 0);
        $this->setGameStateValue(self::GAME_STATE_HOW_MANY_KNOCKING, 0);
        $this->setGameStateValue(self::GAME_STATE_SECOND_KNOCKING_PLAYER_ID, -1);

        // Init game statistics
        // (note: statistics must be defined in stats.json)
        // Table statistics
        $this->initStat('table', 'minPointsInRound', 0);
        $this->initStat('table', 'maxPointsInRound', 0);
        // Player statistics (init for all players at once)
        $this->initStat('player', 'numberOfRoundsWon', 0);
        $this->initStat('player', 'minPointsInRound', 0);
        $this->initStat('player', 'maxPointsInRound', 0);

        // Create cards
        $cards = [];
        foreach([
                    COLOR_BLUE,
                    COLOR_BROWN,
                    COLOR_GRAY,
                    COLOR_GREEN,
                    COLOR_PINK,
                    COLOR_RED,
                    COLOR_YELLOW,
                ] as $colorId) {
            foreach([
                        VALUE_1,
                        VALUE_2,
                        VALUE_3,
                        VALUE_4,
                        VALUE_5,
                        VALUE_6,
                        VALUE_7,
                        VALUE_8,
                    ] as $value) {
                $cards[] = [
                    'type' => $colorId,
                    'type_arg' => $value,
                    'nbr' => 1,
                ];
            }
        }
        $this->deck->createCards($cards, self::CARD_LOCATION_DECK);
    }

    protected function getAllDatas(): array
    {
        $result = [];
        $currentPlayerId = (int) $this->getCurrentPlayerId();
        $activePlayerId = (int) $this->getActivePlayerId();
        $players = $this->getPlayersFromDatabase();

        // Rounds
        $result['currentRound'] = (int) $this->getGameStateValue(self::GAME_STATE_CURRENT_ROUND);
        $result['howManyRounds'] = $this->getHowManyRounds($players);

        // Players
        $result['players'] = $this->formatPlayersForClient($players);
        $result['currentPlayerId'] = $currentPlayerId;
        $result['activePlayerId'] = $activePlayerId;

        // Cards
        $result['currentPlayerCards'] = $this->formatCardsForClient(
            $this->fromBgaCardsToCards($this->deck->getCardsInLocation(self::CARD_LOCATION_PLAYER_HAND, $currentPlayerId))
        );

        return $result;
    }

    public function getGameProgression()
    {
        $howManyRounds = $this->getHowManyRounds();
        $currentRound = ((int) $this->getGameStateValue(self::GAME_STATE_CURRENT_ROUND)) ?: 1;

        return floor((($currentRound - 1) * 100) / $howManyRounds);
    }

////////////////////////////////////////////////////////////////////////////
//////////// Player actions
////////////////////////////////////////////////////////////////////////////

    public function actSwapCard(int $playedPlayerCardId, int $playedTableCardId): void
    {
        // make sure the player card is in player's hand
        $currentPlayerId = (int) $this->getCurrentPlayerId();
        $currentPlayerCards = $this->fromBgaCardsToCards(
            $this->deck->getCardsInLocation(self::CARD_LOCATION_PLAYER_HAND, $currentPlayerId)
        );
        $playedPlayerCard = null;
        foreach ($currentPlayerCards as $playerCard) {
            if ($playerCard->getId() === $playedPlayerCardId) {
                $playedPlayerCard = $playerCard;
                break;
            }
        }
        if ($playedPlayerCard === null) {
            throw new \BgaUserException($this->_('You cannot use a card which is not in your hand.'));
        }

        // make sure the table card is on the table
        $currentTableCards = $this->fromBgaCardsToCards(
            $this->deck->getCardsInLocation(self::CARD_LOCATION_TABLE)
        );
        $playedTableCard = null;
        foreach ($currentTableCards as $tableCard) {
            if ($tableCard->getId() === $playedTableCardId) {
                $playedTableCard = $tableCard;
                break;
            }
        }
        if ($playedTableCard === null) {
            throw new \BgaUserException($this->_('You cannot use a card which is not on the table.'));
        }

        // swap cards
        $newCurrentPlayerCards = $this->swapCard($playedPlayerCard, $playedTableCard, $currentPlayerId, $currentPlayerCards);
        $this->notify->all('cardSwapped', clienttranslate('${player_name} replaced the card ${tableCardImage} with ${playerCardImage}'), [
            'playerId' => $currentPlayerId,
            'playerCard' => $formattedPlayerCard = $this->formatCardForClient($playedPlayerCard),
            'tableCard' => $formattedTableCard = $this->formatCardForClient($playedTableCard),
            'playerCardImage' => $formattedPlayerCard,
            'tableCardImage' => $formattedTableCard,
            'player_name' => $currentPlayerName = $this->getCurrentPlayerName(),
        ]);

        // check if current player has achieved ZERO after this swap
        if ($this->getPointsForCards($newCurrentPlayerCards) === 0) {
            $this->notify->all('zeroAchieved', clienttranslate('${player_name} has achieved a Zero!'), [
                'playerId' => $currentPlayerId,
                'player_name' => $currentPlayerName,
            ]);

            $this->gamestate->nextState('endRound');
            return;
        }

        $this->gamestate->nextState('nextPlayer');
    }

    public function actKnock(): void
    {
        $currentPlayerId = (int) $this->getActivePlayerId();

        $howManyKnockings = (int) $this->getGameStateValue(self::GAME_STATE_HOW_MANY_KNOCKING);
        $howManyKnockings += 1;
        $this->setGameStateValue(self::GAME_STATE_HOW_MANY_KNOCKING, $howManyKnockings);

        // check if this is the second knocking
        if ($howManyKnockings === 2) {
            $this->setGameStateValue(self::GAME_STATE_SECOND_KNOCKING_PLAYER_ID, $currentPlayerId);
            $this->notify->all('secondKnocked', clienttranslate('${player_name} knocked, starting the '), [
                'playerId' => $currentPlayerId,
                'player_name' => $this->getActivePlayerName(),
            ]);
        } else {
            $this->notify->all('knocked', clienttranslate('${player_name} knocked'), [
                'playerId' => $currentPlayerId,
                'player_name' => $this->getActivePlayerName(),
            ]);

        }

        $this->gamestate->nextState('nextPlayer');
    }

////////////////////////////////////////////////////////////////////////////
//////////// Game state arguments
////////////////////////////////////////////////////////////////////////////

    public function argPlayerTurn(): array
    {
        return [
            'activePlayerId' => (int) $this->getActivePlayerId(),
        ];
    }

////////////////////////////////////////////////////////////////////////////
//////////// Game state actions
////////////////////////////////////////////////////////////////////////////

    function stStartRound() {
        // take back all cards and shuffle them
        $this->deck->moveAllCardsInLocation(null, self::CARD_LOCATION_DECK);
        $this->deck->shuffle(self::CARD_LOCATION_DECK);

        // increment current round value
        $newRound = (int) $this->getGameStateValue(self::GAME_STATE_CURRENT_ROUND) + 1;
        $this->setGameStateValue(self::GAME_STATE_CURRENT_ROUND, $newRound);

        // deal cards to each player
        $players = $this->getPlayersFromDatabase();
        foreach ($players as $player)
        {
            $cards = $this->fromBgaCardsToCards(
                $this->deck->pickCards(
                    self::NUMBER_OF_CARDS_TO_DEAL_TO_EACH_PLAYER,
                    self::CARD_LOCATION_DECK,
                    $player->getId()
                )
            );

            $this->notify->player($player->getId(), 'cardsDealt', '', [
                'cards' => $this->formatCardsForClient($cards),
            ]);
        }

        // deal cards on the table
        $cards = $this->fromBgaCardsToCards(
            $this->deck->pickCardsForLocation(
                $this->is2PlayersMode($players) ? self::NUMBER_OF_CARDS_TO_DEAL_ON_THE_TABLE_IN_2_PLAYERS_MODE : self::NUMBER_OF_CARDS_TO_DEAL_ON_THE_TABLE,
                self::CARD_LOCATION_DECK,
                self::CARD_LOCATION_TABLE
            )
        );
        $this->notify->all('cardsDealtOnTable', '', [
            'cards' => $this->formatCardsForClient($cards),
        ]);

        $this->activeNextPlayer();

        $this->notify->all('roundStarted', clienttranslate('Round #${currentRound} starts'), [
            'currentRound' => $newRound,
            'players' => $this->formatPlayersForClient($players),
        ]);

        $this->gamestate->nextState('playerTurn');
    }

    public function stActivateNextPlayer(): void {
        // give extra time to the player who played
        $previousPlayerId = (int) $this->getActivePlayerId();
        $this->giveExtraTime($previousPlayerId);

        // activate next player
        $newPlayerId = (int) $this->activeNextPlayer();

        // check if the second knocking player is the next player
        $secondKnockingPlayerId = (int) $this->getGameStateValue(self::GAME_STATE_SECOND_KNOCKING_PLAYER_ID);
        if ($newPlayerId === $secondKnockingPlayerId) {
            $this->gamestate->nextState('endRound');
            return;
        }

        $this->gamestate->nextState('playerTurn');
    }

    function stEndRound() {
        $players = $this->getPlayersFromDatabase();
        $currentRound = (int) $this->getGameStateValue(self::GAME_STATE_CURRENT_ROUND);
        $howManyRounds = $this->getHowManyRounds($players);
        $isGameOver = $currentRound >= $howManyRounds;

        // update players score
        $lastNumberOfPointsByPlayerId = [];
        foreach ($players as $k => $player) {
            $points = $this->getPointsForCards(
                $this->fromBgaCardsToCards($this->deck->getCardsInLocation(self::CARD_LOCATION_PLAYER_HAND, $player->getId()))
            );
            $lastNumberOfPointsByPlayerId[$player->getId()] = $points;
            $players[$k] = $player->addPoints($points);
            $this->DbQuery(sprintf(
                'UPDATE player SET player_score=%s WHERE player_id=%s',
                $player->getScore(),
                $player->getId()
            ));
        }

        // notify players that the round ends
        $this->notify->all('roundEnded', clienttranslate('Round #${currentRound} ends'), [
            'currentRound' => $currentRound,
            'players' => $this->formatPlayersForClient($players),
        ]);

        // notify players about points won
        $translatedMessageForPoints = clienttranslate('${player_name} wins ${points} point(s)');
        $translatedMessageForNoPoints = clienttranslate('${player_name} does not get any point');
        foreach ($players as $player) {
            $this->notify->all('pointsWon', ($lastNumberOfPointsByPlayerId[$player->getId()] > 0) ? $translatedMessageForPoints : $translatedMessageForNoPoints, [
                'player_name' => $player->getName(),
                'points' => $lastNumberOfPointsByPlayerId[$player->getId()],
            ]);
        }

        // use "Scoring dialogs" to recap scoring for end-users before moving forward
        // @see https://en.doc.boardgamearena.com/Game_interface_logic:_yourgamename.js#Scoring_dialogs
        $headers = [
            '', // the first column of headers is empty
        ];
        $previousPoints = [
            [
                'str' => clienttranslate('Previous score'),
                'args' => [],
            ],
        ];
        $roundPoints = [
            [
                'str' => clienttranslate('Round points'),
                'args' => [],
            ],
        ];
        $totalPoints = [
            [
                'str' => clienttranslate('New score'),
                'args' => [],
            ],
        ];
        foreach ($players as $player) {
            $headers[] = [
                'str' => '${player_name}',
                'args' => [
                    'player_name' => $player->getName(),
                ],
                'type' => 'header'
            ];
            $previousPoints[] = $player->getScore() - $lastNumberOfPointsByPlayerId[$player->getId()];
            $roundPoints[] = $lastNumberOfPointsByPlayerId[$player->getId()] === 0 ? '0' : sprintf('+%s', $lastNumberOfPointsByPlayerId[$player->getId()]);
            $totalPoints[] = $player->getScore();
        }
        $this->notify->all('tableWindow', '', [
            'id' => 'finalScoring',
            'title' => [
                'str' => clienttranslate('Result of round ${currentRound}/${howManyRounds}'),
                'args' => [
                    'currentRound' => $currentRound,
                    'howManyRounds' => $howManyRounds,
                ],
            ],
            'table' => [
                $headers,
                $previousPoints,
                $roundPoints,
                $totalPoints
            ],
            'closing' => $isGameOver ? clienttranslate('End of game') : clienttranslate('Next round')
        ]);

        // update number of rounds won stats for the players who have the lowest points
        $minPointsInThisRound = 1000;
        foreach ($players as $player) {
            if ($lastNumberOfPointsByPlayerId[$player->getId()] < $minPointsInThisRound) {
                $minPointsInThisRound = $lastNumberOfPointsByPlayerId[$player->getId()];
            }
        }
        foreach ($players as $player) {
            if ($lastNumberOfPointsByPlayerId[$player->getId()] === $minPointsInThisRound) {
                $this->incStat(1, 'numberOfRoundsWon', $player->getId());
            }
        }

        // update players min/max points in round stats
        foreach ($players as $player) {
            $minPointsInRoundEarnedByPlayer = $this->getStat('minPointsInRound', $player->getId());
            if ($lastNumberOfPointsByPlayerId[$player->getId()] < $minPointsInRoundEarnedByPlayer) {
                $this->setStat($lastNumberOfPointsByPlayerId[$player->getId()], 'minPointsInRound', $player->getId());
            }
            $maxPointsInRoundEarnedByPlayer = $this->getStat('maxPointsInRound', $player->getId());
            if ($lastNumberOfPointsByPlayerId[$player->getId()] > $maxPointsInRoundEarnedByPlayer) {
                $this->setStat($lastNumberOfPointsByPlayerId[$player->getId()], 'maxPointsInRound', $player->getId());
            }
        }

        if ($isGameOver) {
            // update global min/max points in round stats
            $minPointsInRoundEarnedGlobally = 1000;
            $maxPointsInRoundEarnedGlobally = 0;
            foreach ($players as $player) {
                $minPointsInRoundEarnedByPlayer = $this->getStat('minPointsInRound', $player->getId());
                if ($minPointsInRoundEarnedByPlayer < $minPointsInRoundEarnedGlobally) {
                    $minPointsInRoundEarnedGlobally = $minPointsInRoundEarnedByPlayer;
                }
                $maxPointsInRoundEarnedByPlayer = $this->getStat('maxPointsInRound', $player->getId());
                if ($maxPointsInRoundEarnedByPlayer > $maxPointsInRoundEarnedGlobally) {
                    $maxPointsInRoundEarnedGlobally = $maxPointsInRoundEarnedByPlayer;
                }
            }
            $this->setStat($minPointsInRoundEarnedGlobally, 'minPointsInRound');
            $this->setStat($maxPointsInRoundEarnedGlobally, 'maxPointsInRound');
        }

        // go to next round or end the game
        $this->gamestate->nextState($isGameOver ? 'endGame' : 'nextRound');
    }

////////////////////////////////////////////////////////////////////////////
//////////// Zombie
////////////////////////////////////////////////////////////////////////////

    protected function zombieTurn(array $state, int $active_player): void
    {
        $state_name = $state['name'];

        if ($state['type'] === 'activeplayer') {
            $this->gamestate->nextState('zombiePass');
            return;
        }

        throw new \feException("Zombie mode not supported at this game state: \"{$state_name}\".");
    }

////////////////////////////////////////////////////////////////////////////
////////// DB upgrade
////////////////////////////////////////////////////////////////////////////

    /**
     * Migrate database.
     *
     * You don't have to care about this until your game has been published on BGA. Once your game is on BGA, this
     * method is called everytime the system detects a game running with your old database scheme. In this case, if you
     * change your database scheme, you just have to apply the needed changes in order to update the game database and
     * allow the game to continue to run with your new version.
     *
     * @param int $from_version
     * @return void
     */
    public function upgradeTableDb($from_version)
    {
//       if ($from_version <= 1404301345)
//       {
//            // ! important ! Use DBPREFIX_<table_name> for all tables
//
//            $sql = "ALTER TABLE DBPREFIX_xxxxxxx ....";
//            $this->applyDbUpgradeToAllDB( $sql );
//       }
//
//       if ($from_version <= 1405061421)
//       {
//            // ! important ! Use DBPREFIX_<table_name> for all tables
//
//            $sql = "CREATE TABLE DBPREFIX_xxxxxxx ....";
//            $this->applyDbUpgradeToAllDB( $sql );
//       }
    }

////////////////////////////////////////////////////////////////////////////
////////// Game specific functions
////////////////////////////////////////////////////////////////////////////

    /**
     * @return Player[]
     */
    private function getPlayersFromDatabase(): array {
        $players = array_values($this->getCollectionFromDB(
            'SELECT player_id, player_no, player_name, player_color, player_score FROM player'
        ));

        return array_map(
            fn (array $player) => new Player(
                (int) $player['player_id'],
                (int) $player['player_no'],
                $player['player_name'],
                $player['player_color'],
                (int) $player['player_score'],
            ),
            $players
        );
    }

    /**
     * @param Player[] $players
     */
    private function getPlayerById(int $playerId, array $players = null): Player {
        if ($players === null) {
            $players = $this->getPlayersFromDatabase();
        }

        foreach ($players as $player) {
            if ($player->getId() === $playerId) {
                return $player;
            }
        }

        throw new \BgaVisibleSystemException('Player not found.'); // NOI18N
    }

    /**
     * @param Player[] $players
     */
    private function is2PlayersMode(array $players = null): bool {
        if ($players === null) {
            $players = $this->getPlayersFromDatabase();
        }

        return count($players) === 2;
    }

    /**
     * @param Player[] $players
     * @return array of players indexed by their player ID
     */
    private function formatPlayersForClient(array $players): array {
        $result = [];
        foreach ($players as $player) {
            $result[$player->getId()] = [
                'id' => $player->getId(),
                'position' => $player->getNaturalOrderPosition(),
                'name' => $player->getName(),
                'color' => $player->getColor(),
                'score' => $player->getScore(),
            ];
        }

        return $result;
    }

    private function getHowManyRounds(array $players = null): int {
        $howManyRounds = $this->tableOptions->get(self::GAME_OPTION_HOW_MANY_ROUNDS);

        // support "As many as players" option
        if ($howManyRounds < 1) {
            $howManyRounds = count($players ?? $this->getPlayersFromDatabase());
        }

        return $howManyRounds;
    }

    /**
     * @param Card[] $cards
     */
    private function formatCardsForClient(array $cards): array {
        return array_map(
            fn (Card $card) => $this->formatCardForClient($card),
            $cards
        );
    }

    private function formatCardForClient(Card $card): array {
        return [
            'id' => $card->getId(),
            'color' => $card->getColor(),
            'value' => $card->getValue(),
        ];
    }

    /**
     * @return Card[]
     */
    private function fromBgaCardsToCards(array $bgaCards): array {
        return array_map(
            fn (array $card) => new Card(
                (int) $card['id'],
                (int) $card['type'],
                (int) $card['type_arg']
            ),
            array_values($bgaCards)
        );
    }

    /**
     * @param Card[] $cards
     */
    private function getPointsForCards(array $cards): int {
        /** @var array<int, Card[]> $cardsByColor */
        $cardsByColor = [];
        /** @var array<int, Card[]> $cardsByValue */
        $cardsByValue = [];
        foreach ($cards as $card) {
            $cardsByColor[$card->getColor()][] = $card;
            $cardsByValue[$card->getValue()][] = $card;
        }

        $colorsThatProduce0 = [];
        foreach ($cardsByColor as $color => $cards) {
            if (count($cards) >= self::NUMBER_OF_CARDS_OF_SAME_TYPE_THAT_PRODUCE_0) {
                $colorsThatProduce0[] = $color;
            }
        }
        $valuesThatProduce0 = [];
        foreach ($cardsByValue as $value => $cards) {
            if (count($cards) >= self::NUMBER_OF_CARDS_OF_SAME_TYPE_THAT_PRODUCE_0) {
                $valuesThatProduce0[] = $value;
            }
        }

        // ZERO!
        if (!empty($colorsThatProduce0) && !empty($valuesThatProduce0)) {
            return 0;
        }

        // remove cards, that produce 0 with their color, from $cardsByValue
        foreach ($colorsThatProduce0 as $color) {
            foreach ($cardsByColor[$color] as $card) {
                foreach ($cardsByValue[$card->getValue()] as $k => $c) {
                    if ($c->getId() === $card->getId()) {
                        unset($cardsByValue[$card->getValue()][$k]);
                    }
                }
            }
        }

        // compute points for remaining values
        $points = 0;
        foreach ($cardsByValue as $value => $cards) {
            if (!empty($cards)) {
                $points += $value;
            }
        }

        return $points;
    }

    /**
     * @param Card $playedPlayerCard
     * @param Card $playedTableCard
     * @param int $currentPlayerId
     * @param Card[] $currentPlayerCards
     * @return Card[] $newPlayerCards
     */
    private function swapCard(Card $playedPlayerCard, Card $playedTableCard, int $currentPlayerId, array $currentPlayerCards): array {
        $newPlayerCards = [];

        // swap cards locally to compute $newPlayerCards
        foreach ($currentPlayerCards as $card) {
            if ($card->getId() === $playedPlayerCard->getId()) {
                $newPlayerCards[] = $playedTableCard;
            } else {
                $newPlayerCards[] = $card;
            }
        }

        // swap cards in database
        $this->deck->moveCards($playedPlayerCard->getId(), self::CARD_LOCATION_TABLE);
        $this->deck->moveCards($playedTableCard->getId(), self::CARD_LOCATION_PLAYER_HAND, $currentPlayerId);

        return $newPlayerCards;
    }
}
