import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import TripLesson from './TripLesson';
import { exportAll, getDb, getTripProgress, importAll } from '../lib/db';

vi.mock('../lib/speech', () => ({
  stopSpeaking: vi.fn(),
  ttsAvailable: () => false,
}));
const mount = () =>
  render(
    <MemoryRouter initialEntries={['/trip/politeness']}>
      <Routes>
        <Route path="/trip/:id" element={<TripLesson />} />
      </Routes>
    </MemoryRouter>,
  );
beforeEach(async () => {
  await (await getDb()).clear('tripProgress');
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('travel lesson flow', () => {
  it('restores the exact exercise after leaving and reopening', async () => {
    const first = mount();
    fireEvent.click(
      await screen.findByRole('button', { name: /I’ve practised it/ }),
    );
    await waitFor(() => expect(screen.getByText('2 / 7')).toBeInTheDocument());
    expect((await getTripProgress())[0]?.completedAt).toBeUndefined();
    first.unmount();
    mount();
    await screen.findByText('2 / 7');
    expect(screen.getByText('Arigatō gozaimasu.')).toBeInTheDocument();
  });
  it('completes learn, recall, and reply with honest scores, even without audio', async () => {
    mount();
    for (let i = 0; i < 3; i++) {
      fireEvent.click(
        await screen.findByRole('button', { name: /I’ve practised it/ }),
      );
      await waitFor(() =>
        expect(screen.getByText(`${i + 2} / 7`)).toBeInTheDocument(),
      );
    }
    for (let i = 0; i < 3; i++) {
      fireEvent.click(screen.getByRole('button', { name: 'Reveal & compare' }));
      fireEvent.click(
        screen.getByRole('button', {
          name: i === 0 ? 'Needed help' : 'Recalled it',
        }),
      );
      await waitFor(() =>
        expect(screen.getByText(`${i + 5} / 7`)).toBeInTheDocument(),
      );
    }
    expect(screen.getByText(/Audio is unavailable/)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'How many would you like?' }),
    );
    expect(
      screen.getByText('Not quite. Yes, here you are.'),
    ).toBeInTheDocument();
    expect((await getTripProgress())[0]?.completedAt).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'Finish lesson' }));
    await screen.findByText('Lesson practised ✓');
    const saved = (await getTripProgress())[0]!;
    expect(saved.recalled).toBe(2);
    expect(saved.listeningCorrect).toBe(false);
    expect(saved.completedAt).toBeTruthy();
    const backup = await exportAll();
    await (await getDb()).clear('tripProgress');
    await importAll(backup);
    expect((await getTripProgress())[0]).toEqual(saved);
    const legacy = { ...backup, version: 4 };
    delete legacy.tripProgress;
    await importAll(legacy);
    expect(await getTripProgress()).toEqual([]);
  });
});
