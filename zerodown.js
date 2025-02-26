/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * ZeroDown implementation : © Oliver THEBAULT (a.k.a. Oliboy50)
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 *
 * zerodown.js
 *
 * ZeroDown user interface script
 *
 * In this file, you are describing the logic of your user interface, in Javascript language.
 *
 */

// Cards color ID
const COLOR_BLUE = 10;
const COLOR_BROWN = 20;
const COLOR_GRAY = 30;
const COLOR_GREEN = 40;
const COLOR_PINK = 50;
const COLOR_RED = 60;
const COLOR_YELLOW = 70;

// Cards value
const VALUE_1 = 1;
const VALUE_2 = 2;
const VALUE_3 = 3;
const VALUE_4 = 4;
const VALUE_5 = 5;
const VALUE_6 = 6;
const VALUE_7 = 7;
const VALUE_8 = 8;

// Game constants
const NUMBER_OF_CARDS_IN_HAND = 9;

// DOM IDs
const DOM_ID_APP = 'zerodown-game';
const DOM_ID_BOARD_CARPET = 'board-carpet';
const DOM_ID_PLAYED_CARDS_WRAPPER = 'played-cards';
const DOM_ID_LAST_PLAYED_CARDS = 'last-played-cards';
const DOM_ID_PLAYER_HAND = 'my-hand';
const DOM_ID_PLAYER_HAND_TITLE_WRAPPER = 'my-hand-title-wrapper';
const DOM_ID_PLAYER_HAND_TITLE_WRAPPER_LEFT = 'my-hand-title-wrapper-left';
const DOM_ID_PLAYER_HAND_TITLE_WRAPPER_RIGHT = 'my-hand-title-wrapper-right';
const DOM_ID_PLAYER_HAND_TITLE = 'my-hand-title';
const DOM_ID_PLAYER_HAND_TOGGLE_SORT_BUTTON = 'toggle-sort-button';
const DOM_ID_PLAYER_HAND_TOGGLE_SORT_BUTTON_LABEL = 'toggle-sort-button-label';
const DOM_ID_CURRENT_ROUND = 'current-round';
const DOM_ID_ACTION_BUTTON_SWAP_CARDS = 'action-button-swap-cards';
const DOM_ID_ACTION_BUTTON_KNOCK = 'action-button-knock';

// DOM classes
const DOM_CLASS_PLAYER_TABLE = 'player-table';
const DOM_CLASS_DISABLED_ACTION_BUTTON = 'disabled';
const DOM_CLASS_ACTIVE_PLAYER = 'active';
const DOM_CLASS_CARD = 'card';
const DOM_CLASS_CARD_FRONT_SIDE = 'front-side';
const DOM_CLASS_CARD_BACK_SIDE = 'back-side';

// Player hand sorting modes
const PLAYER_HAND_SORT_BY_COLOR = 'color';
const PLAYER_HAND_SORT_BY_VALUE = 'value';

// Style
const BOARD_CARPET_WIDTH = 740;
const CARD_WIDTH = 90;
const CARD_HEIGHT = 126;
const PLAYER_TABLE_WIDTH = 200;
const PLAYER_TABLE_HEIGHT = CARD_HEIGHT;
const PLAYER_TABLE_HORIZONTAL_MIDDLE_MARGIN = 100;

define([
    'dojo','dojo/_base/declare',
    'ebg/core/gamegui',
    'ebg/counter'
],
function (dojo, declare) {
    return declare('bgagame.zerodown', ebg.core.gamegui, {
        constructor: function () {
            this.resetCurrentState();
            this.currentRound = 0;
            this.howManyRounds = 0;
            this.players = {};
            this.playerHand = null; // https://en.doc.boardgamearena.com/Stock
        },
        setup: function (gamedatas) {
            this.currentState = gamedatas.gamestate.name;
            this.currentRound = gamedatas.currentRound;
            this.howManyRounds = gamedatas.howManyRounds;

            // setup board
            dojo.place(
                `<div id="board">
    <div id="${DOM_ID_BOARD_CARPET}">
        <div id="${DOM_ID_PLAYED_CARDS_WRAPPER}">
            <div id="${DOM_ID_LAST_PLAYED_CARDS}"></div>
        </div>
    </div>
    <div id="game-info" class="player-board">
        ${_('Round')}
        <div id="${DOM_ID_CURRENT_ROUND}"></div>
    </div>
</div>
<div id="my-hand-wrapper" class="whiteblock">
    <div id="${DOM_ID_PLAYER_HAND_TITLE_WRAPPER}">
        <div id="${DOM_ID_PLAYER_HAND_TITLE_WRAPPER_LEFT}">
            <i class="fa fa-hand-paper-o"></i>
            <h3 id="${DOM_ID_PLAYER_HAND_TITLE}">${_('My hand')}</h3>
            <a href="javascript:void(0)" id="${DOM_ID_PLAYER_HAND_TOGGLE_SORT_BUTTON}" class="bgabutton bgabutton_gray"><span id="${DOM_ID_PLAYER_HAND_TOGGLE_SORT_BUTTON_LABEL}"></span></a>
        </div>
        <div id="${DOM_ID_PLAYER_HAND_TITLE_WRAPPER_RIGHT}"></div>
    </div>
    <div id="${DOM_ID_PLAYER_HAND}"></div>
</div>`,
                DOM_ID_APP
            );

            // setup players
            this.players = gamedatas.players;
            // const howManyPlayers = Object.keys(this.players).length;
            // const playersPlace = PLAYERS_PLACES_BY_NUMBER_OF_PLAYERS[howManyPlayers];
            this.sortPlayersToStartWithPlayerIdIfPresent(
                this.sortPlayersByTurnOrderPosition(Object.entries(this.players).map((entry) => entry[1])),
                gamedatas.currentPlayerId
            ).forEach((player, index) => {
                // const playerPosition = playersPlace[index];
                const playerColorRGB = `#${player.color}`;

                // setup player on board
                dojo.place(
                    `<div id="player-table-${player.id}" class="${DOM_CLASS_PLAYER_TABLE}">
    <div class="player-table-name" style="color: ${playerColorRGB};"><span>${(player.name.length > 20 ? (player.name.substring(0, 20) + '...') : player.name)}</span></div>
    <div id="player-table-${player.id}-hand" class="player-table-hand"><div id="player-table-${player.id}-hand-cards" class="player-table-hand-cards"></div></div>
</div>`,
                    DOM_ID_BOARD_CARPET
                );
            });

            // init playerHand "ebg.stock" component
            this.playerHand = new ebg.stock();
            // this.playerHand.create(this, $(DOM_ID_PLAYER_HAND), CARD_WIDTH, CARD_HEIGHT);
            // this.playerHand.resizeItems(CARD_WIDTH, CARD_HEIGHT, CARD_WIDTH * NUMBER_OF_COLUMNS_IN_CARDS_SPRITE, CARD_HEIGHT * NUMBER_OF_ROWS_IN_CARDS_SPRITE);
            this.playerHand.setSelectionAppearance('class');
            // this.playerHand.image_items_per_row = NUMBER_OF_COLUMNS_IN_CARDS_SPRITE;
            // create cards
            // const cardsImageUrl = g_gamethemeurl+'img/cards.png';
            this.execFnForEachCardInGame((color, value) => {
                // const cardPositionInSprite = this.getCardPositionInSpriteByColorAndValue(color, value);
                // this.playerHand.addItemType(
                //     cardPositionInSprite, // stock item ID
                //     cardPositionInSprite, // card weight (used for sorting)
                //     cardsImageUrl, // sprite URL
                //     cardPositionInSprite // position in sprite
                // );
            });
            dojo.connect(this.playerHand, 'onChangeSelection', this, (_, itemId) => {
                if (typeof itemId === 'undefined') {
                    return;
                }

                const cardId = parseInt(itemId, 10);
                if (this.playerHand.isSelected(cardId)) {
                    this.onPlayerCardSelected(cardId);
                } else {
                    this.onPlayerCardUnselected(cardId);
                }
            });
            // sort cards
            this.onClickOnTogglePlayerHandSortButton();
            dojo.connect($(DOM_ID_PLAYER_HAND_TOGGLE_SORT_BUTTON), 'onclick', this, 'onClickOnTogglePlayerHandSortButton');
            // setup currentPlayer cards
            this.addCardsToPlayerHand(gamedatas.currentPlayerCards);

            // setup cards on table
            // @TODO: setup cards on table

            // setup players hidden cards
            this.setupPlayersHiddenCards();

            // setup players score
            this.setupPlayersScore();

            // setup rounds info
            this.setupRoundsInfo();

            // handle game notifications
            this.setupNotifications();
        },

        ///////////////////////////////////////////////////
        //// Game & client states
        ///////////////////////////////////////////////////
        onEnteringState: function (stateName, data) {
            this.currentState = stateName;
            switch (stateName) {
                case 'playerTurn':
                    dojo.addClass(`player-table-${data.args.activePlayerId}`, DOM_CLASS_ACTIVE_PLAYER);
                    break;
            }
        },
        onLeavingState: function (stateName) {
            dojo.query(`.${DOM_CLASS_PLAYER_TABLE}`).removeClass(DOM_CLASS_ACTIVE_PLAYER);

            this.resetCurrentState();
        },
        onUpdateActionButtons: function (stateName, args) {
            this.removeActionButtons();

            if (!this.isCurrentPlayerActive()) {
                return;
            }

            this.currentState = stateName;
            switch (stateName) {
                case 'playerTurn':
                    this.addActionButton(DOM_ID_ACTION_BUTTON_KNOCK, _('Knock'), 'onKnock');
                    // add "play cards" button if player can play
                    this.setupSwapCardsActionButton();
                    break;
            }
        },

        ///////////////////////////////////////////////////
        //// Utility methods
        ///////////////////////////////////////////////////
        /**
         * @Override format_string_recursive BGA framework function
         * @see https://en.doc.boardgamearena.com/BGA_Studio_Cookbook#Inject_images_and_styled_html_in_the_log
         */
        format_string_recursive: function (log, args) {
            try {
                if (log && args && !args.processed) {
                    args.processed = true;

                    for (let key in args) {
                        switch (key) {
                            case 'tableCardImage':
                            case 'playerCardImage':
                                args[key] = this.getLogHtmlForCard(args[key]);
                                break;
                        }
                    }
                }
            } catch (e) {
                console.error('Custom format_string_recursive thrown', log, args, e.stack);
            }
            return this.inherited(arguments); // equivalent to "super()"
        },
        /**
         * @param {Object} card
         * @returns {string}
         */
        getLogHtmlForCard: function (card) {
            // @TODO:
            const position = this.getCardPositionInSpriteByColorAndValue(card.color, card.value);

            return `<div class="${DOM_CLASS_CARD} ${DOM_CLASS_CARD_FRONT_SIDE}" style="width: ${this.getLogHtmlWidthForCard(card)}px; height: 24px;"></div>`;
        },
        getLogHtmlWidthForCard: function (card) {
            return 17;
        },
        /**
         * Return true if:
         *  - the current player is spectator
         *  - the current player is in replay mode
         *  - the game has ended (a.k.a. archive mode)
         * @see https://en.doc.boardgamearena.com/Game_interface_logic:_yourgamename.js
         *
         * @returns {boolean}
         */
        isReadOnly() {
            return this.isSpectator || typeof g_replayFrom !== 'undefined' || g_archive_mode;
        },
        resetDisplayedNumberOfCardsByPlayerId: function () {
            this.displayedNumberOfCardsByPlayerId = {};
            Object.entries(this.players).forEach((entry) => {
                const player = entry[1];

                this.displayedNumberOfCardsByPlayerId[player.id] = NUMBER_OF_CARDS_IN_HAND;
            });
        },
        setupRoundsInfo: function () {
            $(DOM_ID_CURRENT_ROUND).innerHTML = `${this.currentRound} / ${this.howManyRounds}`;
        },
        setupPlayersHiddenCards: function () {
            Object.entries(this.displayedNumberOfCardsByPlayerId).forEach((entry) => {
                const playerId = entry[0];
                const howManyCards = entry[1];

                const playerCardsHtml = [];
                for (let i = 0; i < howManyCards; i++) {
                    playerCardsHtml.push(`<div id="player-table-${playerId}-card-${i}" class="${DOM_CLASS_CARD} ${DOM_CLASS_CARD_BACK_SIDE}"></div>`);
                }
                $(`player-table-${playerId}-hand-cards`).innerHTML = playerCardsHtml.join('');
            });
        },
        setupPlayersScore: function () {
            Object.entries(this.players).forEach((entry) => {
                const player = entry[1];

                if (this.scoreCtrl.hasOwnProperty(player.id)) {
                    this.scoreCtrl[player.id].toValue(player.score);
                }
            });
        },
        setupSwapCardsActionButtonIfNeeded: function () {
            if (
                this.isCurrentPlayerActive()
                && this.currentState === 'playerTurn'
            ) {
                this.setupSwapCardsActionButton();
            }
        },
        setupSwapCardsActionButton: function () {
            if (!$(DOM_ID_ACTION_BUTTON_SWAP_CARDS)) {
                this.addActionButton(DOM_ID_ACTION_BUTTON_SWAP_CARDS, _('Swap selected cards'), 'onSwapCards');
            }
        },
        /**
         * @param {function (number, number)} fn such as (color, value) => {...}
         */
        execFnForEachCardInGame: function (fn) {
            [
                COLOR_BLUE,
                COLOR_BROWN,
                COLOR_GRAY,
                COLOR_GREEN,
                COLOR_PINK,
                COLOR_RED,
                COLOR_YELLOW,
            ].forEach((color) => {
                [
                    VALUE_1,
                    VALUE_2,
                    VALUE_3,
                    VALUE_4,
                    VALUE_5,
                    VALUE_6,
                    VALUE_7,
                    VALUE_8,
                ].forEach((value) => fn.bind(this)(color, value));
            });
        },
        /**
         * This function gives:
         *  - the position of the card in the sprite "cards.png"
         *  - weight to cards to sort them by color (blue-1, blue-2, ...) just like in the sprite
         *  - the type ID for the stock component
         *
         * @param {number} color
         * @param {number} value
         * @returns {number}
         */
        getCardPositionInSpriteByColorAndValue: function (color, value) {
            switch (color) {
                case COLOR_BLUE:
                    return value - 1;
                case COLOR_BROWN:
                    return 7 + value - 1;
                case COLOR_GRAY:
                    return 14 + value - 1;
                case COLOR_GREEN:
                    return 21 + value - 1;
                case COLOR_PINK:
                    return 28 + value - 1;
                case COLOR_RED:
                    return 35 + value - 1;
                case COLOR_YELLOW:
                    return 42 + value - 1;
                default:
                    // Card back
                    throw new Error('Unsupported');
            }
        },
        sortPlayerCardsByCurrentSortingMode: function () {
            const currentSortingMode = this.getCurrentPlayerCardsSortingMode();
            if (currentSortingMode === PLAYER_HAND_SORT_BY_COLOR) {
                this.sortPlayerCardsByColor();
            } else {
                this.sortPlayerCardsByValue();
            }
        },
        sortPlayerCardsByColor: function () {
            const cardsWeightByPosition = {};
            this.execFnForEachCardInGame((color, value) => {
                const cardPositionAndWeight = this.getCardPositionInSpriteByColorAndValue(color, value);
                cardsWeightByPosition[cardPositionAndWeight] = cardPositionAndWeight;
            });

            this.playerHand.changeItemsWeight(cardsWeightByPosition);
        },
        /**
         * @param {number} color
         * @param {number} value
         * @returns {number}
         */
        getCardWeightForColorAndValueToSortThemByValue: function (color, value) {
            return (value * 100) + color;
        },
        sortPlayerCardsByValue: function () {
            const cardsWeightByPosition = {};
            this.execFnForEachCardInGame((color, value) => {
                cardsWeightByPosition[this.getCardPositionInSpriteByColorAndValue(color, value)] = this.getCardWeightForColorAndValueToSortThemByValue(color, value);
            });

            this.playerHand.changeItemsWeight(cardsWeightByPosition);
        },
        unselectAllCards: function () {
            this.playerHand.unselectAll();
        },
        /**
         *
         * @param {number} position
         * @param {number} cardId
         * @returns {Object}
         */
        getCardObjectFromPositionInSpriteAndId: function (position, cardId) {
            let color;
            let value;

            switch (position) {
                case 0:
                    color = COLOR_BLUE;
                    value = VALUE_1;
                    break;
                case 1:
                    color = COLOR_BLUE;
                    value = VALUE_2;
                    break;
                case 2:
                    color = COLOR_BLUE;
                    value = VALUE_3;
                    break;
                case 3:
                    color = COLOR_BLUE;
                    value = VALUE_4;
                    break;
                case 4:
                    color = COLOR_BLUE;
                    value = VALUE_5;
                    break;
                case 5:
                    color = COLOR_BLUE;
                    value = VALUE_6;
                    break;
                case 6:
                    color = COLOR_BLUE;
                    value = VALUE_7;
                    break;
                case 7:
                    color = COLOR_BROWN;
                    value = VALUE_1;
                    break;
                case 8:
                    color = COLOR_BROWN;
                    value = VALUE_2;
                    break;
                case 9:
                    color = COLOR_BROWN;
                    value = VALUE_3;
                    break;
                case 10:
                    color = COLOR_BROWN;
                    value = VALUE_4;
                    break;
                case 11:
                    color = COLOR_BROWN;
                    value = VALUE_5;
                    break;
                case 12:
                    color = COLOR_BROWN;
                    value = VALUE_6;
                    break;
                case 13:
                    color = COLOR_BROWN;
                    value = VALUE_7;
                    break;
                case 14:
                    color = COLOR_GRAY;
                    value = VALUE_1;
                    break;
                case 15:
                    color = COLOR_GRAY;
                    value = VALUE_2;
                    break;
                case 16:
                    color = COLOR_GRAY;
                    value = VALUE_3;
                    break;
                case 17:
                    color = COLOR_GRAY;
                    value = VALUE_4;
                    break;
                case 18:
                    color = COLOR_GRAY;
                    value = VALUE_5;
                    break;
                case 19:
                    color = COLOR_GRAY;
                    value = VALUE_6;
                    break;
                case 20:
                    color = COLOR_GRAY;
                    value = VALUE_7;
                    break;
                case 21:
                    color = COLOR_GREEN;
                    value = VALUE_1;
                    break;
                case 22:
                    color = COLOR_GREEN;
                    value = VALUE_2;
                    break;
                case 23:
                    color = COLOR_GREEN;
                    value = VALUE_3;
                    break;
                case 24:
                    color = COLOR_GREEN;
                    value = VALUE_4;
                    break;
                case 25:
                    color = COLOR_GREEN;
                    value = VALUE_5;
                    break;
                case 26:
                    color = COLOR_GREEN;
                    value = VALUE_6;
                    break;
                case 27:
                    color = COLOR_GREEN;
                    value = VALUE_7;
                    break;
                case 28:
                    color = COLOR_PINK;
                    value = VALUE_1;
                    break;
                case 29:
                    color = COLOR_PINK;
                    value = VALUE_2;
                    break;
                case 30:
                    color = COLOR_PINK;
                    value = VALUE_3;
                    break;
                case 31:
                    color = COLOR_PINK;
                    value = VALUE_4;
                    break;
                case 32:
                    color = COLOR_PINK;
                    value = VALUE_5;
                    break;
                case 33:
                    color = COLOR_PINK;
                    value = VALUE_6;
                    break;
                case 34:
                    color = COLOR_PINK;
                    value = VALUE_7;
                    break;
                case 35:
                    color = COLOR_RED;
                    value = VALUE_1;
                    break;
                case 36:
                    color = COLOR_RED;
                    value = VALUE_2;
                    break;
                case 37:
                    color = COLOR_RED;
                    value = VALUE_3;
                    break;
                case 38:
                    color = COLOR_RED;
                    value = VALUE_4;
                    break;
                case 39:
                    color = COLOR_RED;
                    value = VALUE_5;
                    break;
                case 40:
                    color = COLOR_RED;
                    value = VALUE_6;
                    break;
                case 41:
                    color = COLOR_RED;
                    value = VALUE_7;
                    break;
                case 42:
                    color = COLOR_YELLOW;
                    value = VALUE_1;
                    break;
                case 43:
                    color = COLOR_YELLOW;
                    value = VALUE_2;
                    break;
                case 44:
                    color = COLOR_YELLOW;
                    value = VALUE_3;
                    break;
                case 45:
                    color = COLOR_YELLOW;
                    value = VALUE_4;
                    break;
                case 46:
                    color = COLOR_YELLOW;
                    value = VALUE_5;
                    break;
                case 47:
                    color = COLOR_YELLOW;
                    value = VALUE_6;
                    break;
                case 48:
                    color = COLOR_YELLOW;
                    value = VALUE_7;
                    break;
                case 50:
                    color = COLOR_ADVENTURER;
                    value = VALUE_25;
                    break;
                case 51:
                    color = COLOR_ADVENTURER;
                    value = VALUE_30;
                    break;
                case 52:
                    color = COLOR_ADVENTURER;
                    value = VALUE_35;
                    break;
                case 53:
                    color = COLOR_ADVENTURER;
                    value = VALUE_40;
                    break;
                case 54:
                    color = COLOR_ADVENTURER;
                    value = VALUE_45;
                    break;
                case 55:
                    color = COLOR_ADVENTURER;
                    value = VALUE_50;
                    break;
                case 56:
                    color = COLOR_SPECIAL;
                    value = VALUE_JERSEY_PLUS_TEN;
                    break;
                case 57:
                    color = COLOR_SPECIAL;
                    value = VALUE_LEGENDS_BROOM_WAGON_PLUS_FIVE;
                    break;
                case 58:
                    color = COLOR_SPECIAL;
                    value = VALUE_LEGENDS_EAGLE_ADD_ONE_OTHER_NUMBER;
                    break;
                case 59:
                    color = COLOR_SPECIAL;
                    value = VALUE_LEGENDS_PANDA_ADD_ONE_OTHER_COLOR;
                    break;
                case 60:
                    color = COLOR_SPECIAL;
                    value = VALUE_LEGENDS_SHARK_ONE_RED_MULTIPLY_TEN;
                    break;
                case 61:
                    color = COLOR_SPECIAL;
                    value = VALUE_LEGENDS_BADGER_ANY_NUMBER_OF_EACH_COLOR;
                    break;
                case 62:
                    color = COLOR_SPECIAL;
                    value = VALUE_LEGENDS_ELEPHANT_STOP;
                    break;
                default:
                    throw new Error(`Unsupported card position in sprite: ${position}`);
            }

            return {
                id: cardId,
                color: color,
                value: value,
            };
        },
        /**
         * @returns {Object[]}
         */
        getAllPlayerCards: function () {
            return this.playerHand.getAllItems()
                .map((item) => this.getCardObjectFromPositionInSpriteAndId(item.type, item.id));
        },
        /**
         * @returns {Object[]}
         */
        getSelectedPlayerCards: function () {
            return this.playerHand.getSelectedItems()
                .map((item) => this.getCardObjectFromPositionInSpriteAndId(item.type, item.id));
        },
        /**
         * @param {Object[]} players
         * @returns {Object[]}
         */
        sortPlayersByTurnOrderPosition: function (players) {
            return [...players].sort((a, b) => a.position - b.position);
        },
        /**
         * @param {Object[]} players
         * @param {number} playerId
         * @returns {Object[]}
         */
        sortPlayersToStartWithPlayerIdIfPresent: function (players, playerId) {
            const playerIndex = players.findIndex((player) => player.id === playerId);
            if (playerIndex <= 0) {
                return players;
            }

            return [...players.slice(playerIndex), ...players.slice(0, playerIndex)];
        },
        /**
         * @param {Object[]} cards
         * @param {string} domId
         * @param {function(number)} [onBeforeFirstAnimation]
         * @param {function(number)} [onAfterEachAnimation]
         */
        moveTemporaryCardsFromDomIdToPlayerHand: function (cards, domId, onBeforeFirstAnimation, onAfterEachAnimation) {
            if (cards.length <= 0) {
                return;
            }

            if (typeof onBeforeFirstAnimation === 'function') {
                onBeforeFirstAnimation.bind(this)(0);
            }

            for (let i = 0; i < cards.length; i++) {
                setTimeout(
                    () => {
                        this.addCardsToPlayerHand([cards[i]], true, domId);
                    },
                    i * 1000
                );
                setTimeout(
                    () => {
                        if (typeof onAfterEachAnimation === 'function') {
                            onAfterEachAnimation.bind(this)(i);
                        }
                    },
                    (i + 1) * 1000
                );
            }
        },
        /**
         * @param {Object[]} cards
         * @param {string=} fromDomId
         */
        addCardsToPlayerHand: function (cards, fromDomId) {
            cards.forEach((card) => {
                if (fromDomId) {
                    this.playerHand.addToStockWithId(this.getCardPositionInSpriteByColorAndValue(card.color, card.value), card.id, fromDomId);
                } else {
                    this.playerHand.addToStockWithId(this.getCardPositionInSpriteByColorAndValue(card.color, card.value), card.id);
                }
            });
        },
        /**
         * @param {number} cardId
         */
        removeCardFromPlayerHand: function (cardId) {
            this.playerHand.removeFromStockById(cardId);
        },
        /**
         * @returns {string}
         */
        getCurrentPlayerCardsSortingMode: function () {
            return dojo.attr(DOM_ID_PLAYER_HAND_TOGGLE_SORT_BUTTON, 'data-current-sort');
        },
        resetCurrentState: function () {
            this.currentState = null;
        },

        ///////////////////////////////////////////////////
        //// Player's action
        ///////////////////////////////////////////////////
        /**
         * @param {number} cardId
         */
        onPlayerCardSelected: function (cardId) {
            // @TODO: check if needed
        },
        /**
         * @param {number} cardId
         */
        onPlayerCardUnselected: function (cardId) {
            // @TODO: check if needed
        },
        onClickOnTogglePlayerHandSortButton: function () {
            const currentSortingMode = this.getCurrentPlayerCardsSortingMode();
            if (currentSortingMode === PLAYER_HAND_SORT_BY_COLOR) {
                $(DOM_ID_PLAYER_HAND_TOGGLE_SORT_BUTTON_LABEL).innerHTML = _('Sorted by value');
                dojo.attr(DOM_ID_PLAYER_HAND_TOGGLE_SORT_BUTTON, 'data-current-sort', PLAYER_HAND_SORT_BY_VALUE);
                this.addTooltip(DOM_ID_PLAYER_HAND_TOGGLE_SORT_BUTTON, '', _('Click this button to sort your hand by color.'));
                this.sortPlayerCardsByValue();
            } else {
                $(DOM_ID_PLAYER_HAND_TOGGLE_SORT_BUTTON_LABEL).innerHTML = _('Sorted by color');
                dojo.attr(DOM_ID_PLAYER_HAND_TOGGLE_SORT_BUTTON, 'data-current-sort', PLAYER_HAND_SORT_BY_COLOR);
                this.addTooltip(DOM_ID_PLAYER_HAND_TOGGLE_SORT_BUTTON, '', _('Click this button to sort your hand by value.'));
                this.sortPlayerCardsByColor();
            }
        },
        onSwapCards: function() {
            const action = 'actPlayCard';
            if (!this.checkAction(action)) {
                return;
            }

            const cards = this.getSelectedPlayerCards();
            if (cards.length !== 1) {
                return;
            }
            const playedPlayerCardId = cards[0].id;

            // @TODO: get selected table card ID
            const playedTableCardId = 42;

            this.bgaPerformAction(action, {playedPlayerCardId, playedTableCardId});

            this.unselectAllCards();
        },
        onKnock: function () {
            const action = 'actKnock';
            if (!this.checkAction(action)) {
                return;
            }

            this.bgaPerformAction(action, {});
        },

        ///////////////////////////////////////////////////
        //// Reaction to cometD notifications
        ///////////////////////////////////////////////////
        /**
         * @Override ntf_tableWindow BGA framework function to supporting translating the title of the tableWindow
         * @param {Object|string} notif
         */
        ntf_tableWindow: function (notif) {
            if(typeof notif.args.title === 'object'){
                notif.args.title = this.format_string_recursive(notif.args.title.str, notif.args.title.args);
            }
            this.inherited(arguments);
        },
        setupNotifications: function () {
            const isReadOnly = this.isReadOnly();
            [
                ['roundStarted', 1],
                ['roundEnded', 1],
                ['cardsDealt', 1],
            ].forEach((notif) => {
                const name = notif[0];
                const lockDurationInMs = notif[1];
                const ignoreNotifIfTrue = notif[2];

                dojo.subscribe(name, this, `notif_${name}`);
                this.notifqueue.setSynchronous(name, lockDurationInMs);

                if (ignoreNotifIfTrue) {
                    this.notifqueue.setIgnoreNotificationCheck(name, ignoreNotifIfTrue);
                }
            });
        },
        notif_cardsDealt: function (data) {
            this.playerHand.removeAll();
            this.addCardsToPlayerHand(data.args.cards);
            this.sortPlayerCardsByCurrentSortingMode();
        },
        notif_roundStarted: function (data) {
            this.currentRound = data.args.currentRound;
            this.setupRoundsInfo();

            this.players = data.args.players;
            this.resetDisplayedNumberOfCardsByPlayerId();
            this.setupPlayersHiddenCards();
        },
        notif_roundEnded: function (data) {
            this.players = data.args.players;
            this.resetDisplayedNumberOfCardsByPlayerId();
            this.setupPlayersHiddenCards();

            this.setupPlayersScore();
        },
   });
});
