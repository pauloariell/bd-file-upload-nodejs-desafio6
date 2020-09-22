import { getRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';

interface RequestDTO {
  id: string;
}

class DeleteTransactionService {
  public async execute({ id }: RequestDTO): Promise<void> {
    const transactionRepository = getRepository(Transaction);

    const transaction = await transactionRepository.findOne(id);
    if (!transaction) {
      throw new AppError('Transaction not exist ');
    }
    await transactionRepository.remove(transaction);
  }
}

export default DeleteTransactionService;
