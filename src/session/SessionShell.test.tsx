import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, it } from 'vitest';
import SessionShell from './SessionShell';
import { BLOCKS, useSession } from './useSession';
import { getAllSessions, getDb } from '../lib/db';

afterEach(() => {
  cleanup();
  useSession.getState().reset();
});
it('does not award a session or streak when every section is skipped', async () => {
  await (await getDb()).clear('sessions');
  useSession.getState().start();
  for (const block of BLOCKS) useSession.getState().skipBlock(block.id);
  render(
    <MemoryRouter>
      <SessionShell />
    </MemoryRouter>,
  );
  expect(screen.getByText('No sections completed')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText('0 days')).toBeInTheDocument());
  expect(await getAllSessions()).toEqual([]);
});
