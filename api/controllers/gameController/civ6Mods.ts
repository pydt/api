import * as civ6 from 'civ6-save-parser';
import { Body, Delete, Get, Post, Request, Response, Route, Security, Tags } from 'tsoa';
import { GAME_REPOSITORY_SYMBOL, IGameRepository } from '../../../lib/dynamoose/gameRepository';
import { inject, provideSingleton } from '../../../lib/ioc';
import { ErrorResponse, HttpRequest, HttpResponseError } from '../../framework';
import { CIV6_GAME } from '../../../lib/metadata/civGames/civ6';
import { GAME_TURN_SERVICE_SYMBOL, IGameTurnService } from '../../../lib/services/gameTurnService';
import { sortBy } from 'lodash';

@Route('game')
@Tags('game')
@provideSingleton(GameController_Civ6Mods)
export class GameController_Civ6Mods {
  constructor(
    @inject(GAME_REPOSITORY_SYMBOL) private gameRepository: IGameRepository,
    @inject(GAME_TURN_SERVICE_SYMBOL) private gameTurnService: IGameTurnService
  ) {}

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Get('{gameId}/civ6Mods')
  public async getCiv6Mods(
    @Request() request: HttpRequest,
    gameId: string
  ): Promise<RawCiv6Mods[]> {
    const { buffer } = await this.core(request, gameId);

    const wrapper = civ6.parse(buffer);

    return this.getModsFromWrapper(wrapper);
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Post('{gameId}/civ6Mods')
  public async addCiv6Mod(
    @Request() request: HttpRequest,
    gameId: string,
    @Body() body: RawCiv6Mods
  ): Promise<RawCiv6Mods[]> {
    const { game, buffer } = await this.core(request, gameId);

    const updatedBuffer = Buffer.concat(civ6.addMod(buffer, body.id, body.title).chunks);

    await this.gameTurnService.storeSave(game, updatedBuffer);

    return this.getModsFromWrapper(civ6.parse(updatedBuffer));
  }

  @Security('api_key')
  @Response<ErrorResponse>(401, 'Unauthorized')
  @Delete('{gameId}/civ6Mods/{modId}')
  public async deleteCiv6Mod(
    @Request() request: HttpRequest,
    gameId: string,
    modId: string
  ): Promise<RawCiv6Mods[]> {
    const { game, buffer } = await this.core(request, gameId);

    const updatedBuffer = Buffer.concat(civ6.deleteMod(buffer, modId).chunks);

    await this.gameTurnService.storeSave(game, updatedBuffer);

    return this.getModsFromWrapper(civ6.parse(updatedBuffer));
  }

  private async core(request: HttpRequest, gameId: string) {
    const game = await this.gameRepository.getOrThrow404(gameId);

    if (!game.inProgress) {
      throw new HttpResponseError(400, 'Game not in progress');
    }

    if (game.gameType !== CIV6_GAME.id) {
      throw new HttpResponseError(400, 'Game is not Civ 6');
    }

    if (game.createdBySteamId !== request.user) {
      throw new HttpResponseError(400, `Only admin can manage mods!`);
    }

    const buffer = await this.gameTurnService.loadSaveFile(game);

    return {
      game,
      buffer
    };
  }

  private getModsFromWrapper(wrapper): RawCiv6Mods[] {
    const modBlockList = Object.keys(wrapper.parsed).flatMap(x =>
      x.startsWith('MOD_BLOCK_') ? [wrapper.parsed[x]] : []
    );

    const result: Record<string, RawCiv6Mods> = {};

    for (const block of modBlockList) {
      for (const mod of block.data) {
        const modId = mod.MOD_ID.data;

        if (!result[modId]) {
          result[modId] = {
            id: modId,
            title: mod.MOD_TITLE.data
          };
        }
      }
    }

    return sortBy(Object.values(result), 'id');
  }
}

export interface RawCiv6Mods {
  id: string;
  title: string;
}
