import { getRepository, getCustomRepository } from 'typeorm';

import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface RequestDTO {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category_title: string;
}

class CreateTransactionService {
  public async execute({
    title,
    value,
    type,
    category_title,
  }: RequestDTO): Promise<Transaction> {
    const categoryRepository = getRepository(Category);
    const transactionRepository = getRepository(Transaction);

    const checkCategoryExist = await categoryRepository.findOne({
      where: { title: category_title },
    });

    let category_id: string;

    if (checkCategoryExist) {
      category_id = checkCategoryExist.id;
    } else {
      const category = await categoryRepository.create({
        title: category_title,
      });
      await categoryRepository.save(category);
      category_id = category.id;
    }

    if (type === 'outcome') {
      const transactionsRepository = getCustomRepository(
        TransactionsRepository,
      );

      const transactions = await transactionsRepository.find();

      const balance = await transactionsRepository.getBalance(transactions);

      if (balance.total < value) {
        throw new AppError('You have no balance');
      }
    }

    const transaction = transactionRepository.create({
      title,
      value,
      type,
      category_id,
    });

    await transactionRepository.save(transaction);

    return transaction;
  }
}

export default CreateTransactionService;
