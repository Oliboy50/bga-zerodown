<?php

declare(strict_types=1);

namespace Bga\Games\ZeroDown;

class Player
{
    public function __construct(
        private readonly int $bgaId,
        private readonly int $naturalOrderPosition,
        private readonly string $name,
        private readonly string $color,
        private int $score,
    ) {
    }

    /*
     * GETTERS
     */
    public function getId(): int
    {
        return $this->bgaId;
    }
    public function getNaturalOrderPosition(): int
    {
        return $this->naturalOrderPosition;
    }
    public function getName(): string
    {
        return $this->name;
    }
    public function getColor(): string
    {
        return $this->color;
    }
    public function getScore(): int
    {
        return $this->score;
    }

    /*
     *  SETTERS
     */
    public function addPoints(int $points): self
    {
        $this->score = $this->score + $points;

        return $this;
    }
}
